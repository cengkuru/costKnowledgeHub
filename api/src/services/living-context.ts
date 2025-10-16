import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import {
  LivingContextSummary,
  ScoredDocChunk,
  ExaResult,
  Citation
} from '../types.js';
import {
  exaSearch,
  ExaSearchOptions,
  ExaTemporalOptions,
  TemporalPreset
} from './exaClient.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const synthesisModel = genAI.getGenerativeModel({
  model: config.geminiModel,
  generationConfig: {
    temperature: 0.35,
    maxOutputTokens: 1_200
  }
});

export interface LivingContextOptions {
  externalResults?: ExaResult[];
  exaOptions?: ExaSearchOptions;
  maxInternalDocs?: number;
  maxExternalDocs?: number;
  temporalPreset?: TemporalPreset;
}

export interface LivingContextPayload {
  summary: LivingContextSummary;
  externalResults: ExaResult[];
}

const DEFAULT_INTERNAL_LIMIT = 6;
const DEFAULT_EXTERNAL_LIMIT = 6;

const detectTemporalIntent = (query: string): ExaTemporalOptions | undefined => {
  const lowered = query.toLowerCase();

  if (/\b(202[3-9]|2030)\b/.test(lowered)) {
    const match = lowered.match(/\b(202[3-9])\b/);
    if (match) {
      return { from: `${match[1]}-01`, to: `${match[1]}-12` };
    }
  }

  if (lowered.includes('latest') || lowered.includes('recent') || lowered.includes('current')) {
    return { preset: 'lastQuarter' };
  }

  if (lowered.includes('emerging') || lowered.includes('new research')) {
    return { preset: 'lastMonth' };
  }

  return undefined;
};

const formatInternalContext = (docs: ScoredDocChunk[]): string =>
  docs
    .map((doc, index) => {
      const yearFragment = doc.year ? ` (Year: ${doc.year})` : '';
      const countryFragment = doc.country ? ` [${doc.country}]` : '';

      const excerpt = doc.text ? doc.text.slice(0, 900) : '';

      return `[#I${index + 1}] ${doc.title}${yearFragment}${countryFragment}
URL: ${doc.url}
TYPE: ${doc.type}
EXCERPT:
${excerpt}
`;
    })
    .join('\n');

const formatExternalContext = (results: ExaResult[]): string =>
  results
    .map((result, index) => {
      const dateLabel = result.publishedDate ? ` (${result.publishedDate})` : '';
      const snippet = result.text || result.highlights?.[0]?.snippet || '';
      return `[#E${index + 1}] ${result.title}${dateLabel}
URL: ${result.url}
SNIPPET:
${snippet}
`;
    })
    .join('\n');

const calculateRecencyLabel = (publishedDate?: string): string | undefined => {
  if (!publishedDate) {
    return undefined;
  }

  const parsed = new Date(publishedDate);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return undefined;
  }

  if (diffDays === 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    return `${Math.round(diffDays / 7)} weeks ago`;
  }
  if (diffDays < 365) {
    return `${Math.round(diffDays / 30)} months ago`;
  }
  return `${Math.round(diffDays / 365)} years ago`;
};

const safeParseSummary = (payload: string): LivingContextSummary | undefined => {
  try {
    const jsonMatch = payload.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : payload;
    const parsed = JSON.parse(jsonText) as LivingContextSummary;
    return parsed;
  } catch (error) {
    console.error('Living context JSON parse failed:', error);
    return undefined;
  }
};

const toCitation = (input: { title: string; url: string } | undefined): Citation | undefined => {
  if (!input?.title || !input.url) {
    return undefined;
  }
  return { title: input.title, url: input.url };
};

export const buildLivingContext = async (
  query: string,
  internalDocs: ScoredDocChunk[],
  options: LivingContextOptions = {}
): Promise<LivingContextPayload> => {
  const {
    externalResults,
    exaOptions,
    maxInternalDocs = DEFAULT_INTERNAL_LIMIT,
    maxExternalDocs = DEFAULT_EXTERNAL_LIMIT,
    temporalPreset
  } = options;

  const internalForContext = internalDocs.slice(0, maxInternalDocs);

  const temporalIntent = temporalPreset
    ? { preset: temporalPreset }
    : detectTemporalIntent(query);

  const external = externalResults ??
    (await exaSearch(query, {
      numResults: maxExternalDocs,
      includeContent: true,
      allowAllDomains: true,
      temporal: temporalIntent,
      sortBy: temporalIntent ? 'recent' : 'relevance',
      ...exaOptions
    }));

  const prompt = `
You are the CoST Living Context Engine. Combine institutional knowledge with live web intelligence.

Task: Respond with a JSON object that fuses internal evidence (#I references) with external signals (#E references).

Rules:
- Highlight what is stable institutional wisdom vs. what is emerging or controversial.
- Detect contradictions where external sources challenge CoST guidance.
- Flag freshness by comparing timestamps.
- Celebrate cross-country learnings (e.g. "South Africa's approach informs Uganda").

JSON schema:
{
  "headline": "string",
  "synthesis": "string",
  "internalHighlights": [{ "title": "string", "url": "string" }],
  "externalInsights": [
    {
      "title": "string",
      "url": "string",
      "summary": "string",
      "stance": "supports" | "expands" | "contradicts",
      "publishedDate": "string?",
      "recencyLabel": "string?"
    }
  ],
  "freshnessSignals": [
    {
      "description": "string",
      "emphasis": "reinforces" | "challenges" | "emerging",
      "sourceType": "internal" | "external",
      "references": [{ "title": "string", "url": "string" }],
      "observedAt": "string"
    }
  ],
  "contradictions": [
    {
      "theme": "string",
      "internalPosition": "string",
      "externalPosition": "string",
      "severity": "low" | "medium" | "high",
      "references": [{ "title": "string", "url": "string" }]
    }
  ]
}

Focus on the question: "${query}"

Internal knowledge:
${formatInternalContext(internalForContext)}

External signals:
${formatExternalContext(external.slice(0, maxExternalDocs))}
`.trim();

  try {
    const response = await synthesisModel.generateContent(prompt);
    const text = response.response.text().trim();
    const summary = safeParseSummary(text);

    if (summary) {
      const enrichedSummary: LivingContextSummary = {
        ...summary,
        internalHighlights: summary.internalHighlights
          ?.map(toCitation)
          .filter((item): item is Citation => Boolean(item)) ?? [],
        externalInsights: summary.externalInsights?.map(insight => {
          const matchingSource = external.find(result => result.url === insight.url);
          return {
            ...insight,
            publishedDate: insight.publishedDate || matchingSource?.publishedDate,
            recencyLabel:
              insight.recencyLabel ||
              calculateRecencyLabel(insight.publishedDate || matchingSource?.publishedDate)
          };
        }) ?? [],
        freshnessSignals: summary.freshnessSignals?.map(signal => ({
          ...signal,
          references: signal.references
            ?.map(toCitation)
            .filter((item): item is Citation => Boolean(item)) ?? []
        })) ?? [],
        contradictions: summary.contradictions?.map(contradiction => ({
          ...contradiction,
          references: contradiction.references
            ?.map(toCitation)
            .filter((item): item is Citation => Boolean(item)) ?? []
        })) ?? []
      };

      return {
        summary: enrichedSummary,
        externalResults: external
      };
    }
  } catch (error) {
    console.error('Living context synthesis failed:', error);
  }

  // Fallback summary
  const fallbackSummary: LivingContextSummary = {
    headline: `Hybrid knowledge check for "${query}"`,
    synthesis: 'Unable to synthesize a living context summary right now. Review the highlighted internal and external sources directly.',
    internalHighlights: internalForContext
      .slice(0, 3)
      .map(doc => ({ title: doc.title, url: doc.url })),
    externalInsights: external.slice(0, 3).map(result => ({
      title: result.title,
      url: result.url,
      summary: result.text || 'Review the source for details.',
      stance: 'expands',
      publishedDate: result.publishedDate,
      recencyLabel: calculateRecencyLabel(result.publishedDate)
    })),
    freshnessSignals: [],
    contradictions: []
  };

  return {
    summary: fallbackSummary,
    externalResults: external
  };
};
