import { embed } from './embedder.js';
import { vectorSearch } from './vectorStore.js';
import { analyzeIntent } from './intent-analyzer.js';
import {
  FilterSuggestion,
  FilterSuggestionsResponse,
  SearchFilters,
  ScoredDocChunk
} from '../types.js';

type ContextualFilterParams = Pick<SearchFilters, 'q' | 'topic' | 'country' | 'year'>;

const DEFAULT_RESPONSE: FilterSuggestionsResponse = {
  spotlight: undefined,
  supporting: [],
  metadataInsights: {
    topTopics: [],
    topCountries: [],
    timeline: {
      newestYear: undefined,
      oldestYear: undefined,
      summary: 'Results have not been explored yet.'
    }
  }
};

/**
 * Generate contextual filter suggestions based on the current query and corpus signals
 */
export const getContextualFilterSuggestions = async (
  params: ContextualFilterParams
): Promise<FilterSuggestionsResponse> => {
  const query = params.q?.trim();

  if (!query || query.length < 2) {
    return DEFAULT_RESPONSE;
  }

  // Build metadata filters from current selection
  const metadataFilters: Record<string, unknown> = {};
  if (params.topic) metadataFilters.type = params.topic;
  if (params.country) metadataFilters.country = params.country;
  if (params.year) metadataFilters.year = Number(params.year);

  // Run intent analysis and gather corpus signals in parallel
  const [intent, embedding] = await Promise.all([
    analyzeIntent(query),
    embed(query) as Promise<number[]>
  ]);

  const { results } = await vectorSearch({
    qEmbedding: embedding,
    limit: 30,
    offset: 0,
    filters: metadataFilters
  });

  if (!results || results.length === 0) {
    return {
      spotlight: buildSpotlightFromIntent(intent, undefined),
      supporting: [],
      metadataInsights: {
        topTopics: [],
        topCountries: [],
        timeline: {
          newestYear: undefined,
          oldestYear: undefined,
          summary: 'No dated material returned yet—try broadening the search.'
        }
      }
    };
  }

  const topicInsights = aggregateCounts(results, 'type');
  const countryInsights = aggregateCounts(results, 'country');
  const yearInsights = aggregateYears(results);

  const spotlight = buildSpotlightFromIntent(intent, results[0]);
  const supporting = buildSupportingSuggestions({
    intent,
    topicInsights,
    countryInsights,
    yearInsights,
    activeFilters: params
  });

  return {
    spotlight,
    supporting,
    metadataInsights: {
      topTopics: topicInsights.slice(0, 3),
      topCountries: countryInsights.slice(0, 3),
      timeline: {
        newestYear: yearInsights.newest,
        oldestYear: yearInsights.oldest,
        summary: timelineSummary(yearInsights)
      }
    }
  };
};

/**
 * Aggregate field counts from vector results
 */
function aggregateCounts(
  results: ScoredDocChunk[],
  field: 'type' | 'country'
): { value: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const doc of results) {
    const value = doc[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }));
}

/**
 * Aggregate publication years from results
 */
function aggregateYears(results: ScoredDocChunk[]): {
  newest?: number;
  oldest?: number;
  distribution: Map<number, number>;
} {
  const years = results
    .map(doc => doc.year)
    .filter((year): year is number => typeof year === 'number');

  const distribution = new Map<number, number>();
  for (const year of years) {
    distribution.set(year, (distribution.get(year) || 0) + 1);
  }

  const sorted = years.sort((a, b) => a - b);

  return {
    newest: sorted[sorted.length - 1],
    oldest: sorted[0],
    distribution
  };
}

/**
 * Build dynamic summary for timeline insight
 */
function timelineSummary(yearInsights: {
  newest?: number;
  oldest?: number;
  distribution: Map<number, number>;
}): string {
  const { newest, oldest, distribution } = yearInsights;

  if (!newest || !oldest) {
    return 'Publication dates are scarce—consider broadening the timeframe.';
  }

  if (newest === oldest) {
    return `Evidence concentrates in ${newest}.`;
  }

  const newestCount = distribution.get(newest) || 0;
  const oldestCount = distribution.get(oldest) || 0;

  if (newestCount > oldestCount) {
    return `Insights stretch ${oldest}–${newest}, with momentum building in ${newest}.`;
  }

  if (oldestCount > newestCount) {
    return `The richest material sits between ${oldest} and ${newest}; revisit the early groundwork.`;
  }

  return `Coverage runs ${oldest}–${newest}, evenly balanced across the years.`;
}

/**
 * Construct spotlight suggestion from intent analysis
 */
const normalizeType = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const candidate = value.find(item => typeof item === 'string' && item.trim()) as string | undefined;
    return candidate?.trim();
  }
  if (value && typeof value === 'object' && 'value' in value) {
    const maybeValue = (value as { value?: unknown }).value;
    if (typeof maybeValue === 'string' && maybeValue.trim()) {
      return maybeValue.trim();
    }
  }
  return undefined;
};

const safeLower = (value: string | undefined): string | undefined =>
  typeof value === 'string' ? value.toLowerCase() : undefined;

function buildSpotlightFromIntent(intent: Awaited<ReturnType<typeof analyzeIntent>>, firstDoc?: ScoredDocChunk): FilterSuggestion | undefined {
  const type = normalizeType(intent.suggestedFilters?.type);

  if (!type) {
    const docType = normalizeType(firstDoc?.type);
    if (!docType) return undefined;
    return {
      id: 'spotlight-top-type',
      label: `Lean into ${safeLower(docType) ?? docType}s`,
      description: `Keeps the lens on the dominant document format surfacing for this query.`,
      filters: { topic: docType },
      tone: 'spotlight',
      confidence: 0.55
    };
  }

  const implicit = intent.implicitNeeds?.[0];
  const loweredType = safeLower(type) ?? type;
  const loweredNeed = safeLower(implicit) ?? implicit;
  const description = implicit
    ? `Anchors the search in ${loweredType}s so you can address ${loweredNeed}.`
    : `Keeps the focus aligned with the intent we detected—structured ${loweredType} guidance.`;

  return {
    id: 'spotlight-intent',
    label: `Stay with ${loweredType}s`,
    description,
    filters: { topic: type },
    tone: 'spotlight',
    confidence: Math.min(1, Math.max(intent.confidence || 0.6, 0.5))
  };
}

/**
 * Build supporting suggestions (expand, challenge) from corpus signals
 */
function buildSupportingSuggestions(input: {
  intent: Awaited<ReturnType<typeof analyzeIntent>>;
  topicInsights: { value: string; count: number }[];
  countryInsights: { value: string; count: number }[];
  yearInsights: { newest?: number; oldest?: number };
  activeFilters: ContextualFilterParams;
}): FilterSuggestion[] {
  const suggestions: FilterSuggestion[] = [];
  const { intent, topicInsights, countryInsights, yearInsights, activeFilters } = input;

  const topCountry = countryInsights.find(c => c.value && c.value !== activeFilters.country);
  if (topCountry) {
    suggestions.push({
      id: `country-${topCountry.value.toLowerCase().replace(/\s+/g, '-')}`,
      label: `Dial into ${topCountry.value}`,
      description: `Tightens the scope to the country most present in these results.`,
      filters: {
        ...activeFilters,
        country: topCountry.value
      },
      tone: 'focus',
      confidence: 0.5 + Math.min(topCountry.count / 10, 0.3)
    });
  }

  if (yearInsights.newest && yearInsights.newest !== activeFilters.year) {
    suggestions.push({
      id: `year-${yearInsights.newest}`,
      label: `Prioritise ${yearInsights.newest}`,
      description: `Surfaces the freshest material responding to this query.`,
      filters: {
        ...activeFilters,
        year: yearInsights.newest
      },
      tone: 'focus',
      confidence: 0.55
    });
  }

  if (intent.suggestedFilters?.includeHistorical && yearInsights.oldest && yearInsights.oldest < (yearInsights.newest ?? yearInsights.oldest)) {
    suggestions.push({
      id: 'historical-span',
      label: 'Revisit the early groundwork',
      description: `Contrast the newest findings with foundational material from ${yearInsights.oldest}.`,
      filters: {
        ...activeFilters,
        year: yearInsights.oldest
      },
      tone: 'expand',
      confidence: 0.45
    });
  }

  const secondaryTopic = topicInsights
    .filter(t => t.value !== activeFilters.topic)
    .slice(0, 1)
    .pop();

  if (secondaryTopic) {
    suggestions.push({
      id: `topic-${secondaryTopic.value.toLowerCase().replace(/\s+/g, '-')}`,
      label: `Pivot to ${secondaryTopic.value.toLowerCase()}`,
      description: `Offers a complementary document type frequently cited alongside your current focus.`,
      filters: {
        ...activeFilters,
        topic: secondaryTopic.value
      },
      tone: 'challenge',
      confidence: 0.4 + Math.min(secondaryTopic.count / 12, 0.25)
    });
  }

  return suggestions;
}
