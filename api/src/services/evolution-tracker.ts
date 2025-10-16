import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import {
  EvolutionQueryResponse,
  EvolutionShift,
  ScoredDocChunk,
  TemporalPerspective
} from '../types.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const evolutionModel = genAI.getGenerativeModel({
  model: config.geminiModel,
  generationConfig: {
    temperature: 0.35,
    maxOutputTokens: 1_200
  }
});

export interface EvolutionTrackerOptions {
  topic?: string;
  maxDocs?: number;
  minYear?: number;
  maxYear?: number;
}

const DEFAULT_MAX_DOCS = 18;

const filterAndSortDocs = (
  docs: ScoredDocChunk[],
  options: EvolutionTrackerOptions
): ScoredDocChunk[] => {
  const { minYear, maxYear, maxDocs = DEFAULT_MAX_DOCS } = options;
  return docs
    .filter(doc => typeof doc.year === 'number')
    .filter(doc => {
      if (minYear && doc.year && doc.year < minYear) {
        return false;
      }
      if (maxYear && doc.year && doc.year > maxYear) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    .slice(0, maxDocs);
};

const formatDocTimeline = (docs: ScoredDocChunk[]): string =>
  docs
    .map((doc, index) => {
      const yearLabel = doc.year ? doc.year : 'unknown';
      const countryLabel = doc.country ? ` (${doc.country})` : '';
      const snippet = doc.text ? doc.text.slice(0, 500) : '';
      return `[#${index + 1}] ${doc.title}${countryLabel} - ${yearLabel}
Type: ${doc.type}
Snippet:
${snippet}
`;
    })
    .join('\n');

const safeParseEvolution = (payload: string): EvolutionQueryResponse | undefined => {
  try {
    const jsonMatch = payload.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : payload;
    const parsed = JSON.parse(jsonText) as EvolutionQueryResponse;
    return parsed;
  } catch (error) {
    console.error('Evolution tracker JSON parse failed:', error);
    return undefined;
  }
};

export const analyzeMethodologyEvolution = async (
  query: string,
  docs: ScoredDocChunk[],
  options: EvolutionTrackerOptions = {}
): Promise<EvolutionQueryResponse> => {
  const filteredDocs = filterAndSortDocs(docs, options);
  const topic = options.topic ?? query;

  const prompt = `
You are the Time Oracle historian for the CoST initiative.
Map how the methodology evolved for the focus "${topic}" using the provided documents.

Respond with JSON matching:
{
  "topic": "string",
  "shifts": [
    {
      "phase": "string",
      "period": { "from": 2016, "to": 2019 },
      "shiftSummary": "string",
      "drivers": ["string"],
      "representativeDocs": [{ "title": "string", "url": "string" }]
    }
  ],
  "methodologyHighlights": [
    { "year": 2018, "viewpoint": "string", "references": [{ "title": "string", "url": "string" }] }
  ],
  "lastUpdated": "ISO timestamp"
}

Documents to analyze (chronological):
${formatDocTimeline(filteredDocs)}
`.trim();

  try {
    const response = await evolutionModel.generateContent(prompt);
    const text = response.response.text().trim();
    const parsed = safeParseEvolution(text);

    if (parsed) {
      const sanitizedShifts: EvolutionShift[] = parsed.shifts?.map(shift => ({
        phase: shift.phase,
        period: {
          from: shift.period?.from ?? filteredDocs[0]?.year ?? 0,
          to: shift.period?.to ?? filteredDocs[filteredDocs.length - 1]?.year ?? shift.period?.from ?? 0
        },
        shiftSummary: shift.shiftSummary,
        drivers: shift.drivers ?? [],
        representativeDocs: shift.representativeDocs ?? []
      })) ?? [];

      const sanitizedHighlights: TemporalPerspective[] = parsed.methodologyHighlights?.map(highlight => ({
        year: highlight.year ?? filteredDocs[0]?.year ?? new Date().getFullYear(),
        viewpoint: highlight.viewpoint,
        references: highlight.references ?? []
      })) ?? [];

      return {
        topic: parsed.topic || topic,
        shifts: sanitizedShifts,
        methodologyHighlights: sanitizedHighlights,
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Methodology evolution analysis failed:', error);
  }

  const fallbackShifts: EvolutionShift[] = filteredDocs.length
    ? [
        {
          phase: 'Foundational transparency push',
          period: { from: filteredDocs[0].year ?? 2013, to: (filteredDocs[0].year ?? 2013) + 2 },
          shiftSummary: 'Initial guidance focused on publishing baseline project data to meet disclosure commitments.',
          drivers: ['Global pressure for open data', 'CoST roll-outs in pilot countries'],
          representativeDocs: filteredDocs.slice(0, 1).map(doc => ({
            title: doc.title,
            url: doc.url
          }))
        },
        {
          phase: 'Institutionalization and assurance',
          period: { from: (filteredDocs[0].year ?? 2013) + 3, to: (filteredDocs[0].year ?? 2013) + 6 },
          shiftSummary: 'CoST practitioners integrated assurance processes and multi-stakeholder governance.',
          drivers: ['Need for credible verification', 'Learning from early implementations'],
          representativeDocs: filteredDocs.slice(1, 3).map(doc => ({
            title: doc.title,
            url: doc.url
          }))
        }
      ]
    : [];

  const fallbackHighlights: TemporalPerspective[] = filteredDocs.slice(0, 4).map(doc => ({
    year: doc.year ?? new Date().getFullYear(),
    viewpoint: `Document "${doc.title}" emphasized ${doc.type} priorities for transparency.`,
    references: [{ title: doc.title, url: doc.url }]
  }));

  return {
    topic,
    shifts: fallbackShifts,
    methodologyHighlights: fallbackHighlights,
    lastUpdated: new Date().toISOString()
  };
};
