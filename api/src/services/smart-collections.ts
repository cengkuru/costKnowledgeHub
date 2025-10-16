import { embed } from './embedder.js';
import { vectorSearch } from './vectorStore.js';
import { extractInsightClusters } from './connection-engine.js';
import {
  SmartCollection,
  SmartCollectionEntry,
  SearchFilters,
  ScoredDocChunk
} from '../types.js';

type SmartCollectionParams = Pick<SearchFilters, 'q' | 'topic' | 'country' | 'year'>;

/**
 * Build AI-driven smart collections from the current query context
 */
export const buildSmartCollections = async (
  params: SmartCollectionParams
): Promise<SmartCollection[]> => {
  const query = params.q?.trim();

  if (!query || query.length < 2) {
    return [];
  }

  const metadataFilters: Record<string, unknown> = {};
  if (params.topic) metadataFilters.type = params.topic;
  if (params.country) metadataFilters.country = params.country;
  if (params.year) metadataFilters.year = Number(params.year);

  const qEmbedding = await embed(query) as number[];
  const { results } = await vectorSearch({
    qEmbedding,
    limit: 40,
    offset: 0,
    filters: metadataFilters
  });

  if (!results || results.length < 3) {
    return fallbackCollections(results || []);
  }

  const clusters = await extractInsightClusters(results);
  const indexedDocs = indexDocs(results);

  const collections = clusters
    .map<SmartCollection | null>((cluster, index) => {
      const items = cluster.documents
        .map(docTitle => indexedDocs.get(docTitle))
        .filter((doc): doc is ScoredDocChunk => Boolean(doc))
        .slice(0, 4)
        .map(toCollectionEntry);

      if (items.length === 0) return null;

      return {
        id: `cluster-${index}`,
        name: formatTitle(cluster.theme),
        description: cluster.keyInsight,
        timeframe: buildTimeframe(items),
        actionable: cluster.actionable,
        novelty: cluster.novelty,
        items
      };
    })
    .filter((collection): collection is SmartCollection => Boolean(collection))
    .slice(0, 3);

  if (collections.length > 0) {
    return collections;
  }

  return fallbackCollections(results);
};

/**
 * Fallback grouping when AI clustering returns nothing
 */
function fallbackCollections(results: ScoredDocChunk[]): SmartCollection[] {
  if (results.length === 0) return [];

  const recency = [...results]
    .filter(doc => doc.year)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 4);

  const global = [...results]
    .filter(doc => doc.country)
    .slice(0, 4);

  const collections: SmartCollection[] = [];

  if (recency.length > 0) {
    const entries = recency.map(toCollectionEntry);
    collections.push({
      id: 'fallback-recency',
      name: 'Fresh Momentum',
      description: 'The newest releases answering this question.',
      timeframe: buildTimeframe(entries),
      actionable: 'Use these to brief stakeholders on the latest shifts.',
      novelty: 0.45,
      items: entries
    });
  }

  if (global.length > 0) {
    const entries = global.map(toCollectionEntry);
    collections.push({
      id: 'fallback-parallel',
      name: 'Global Parallels',
      description: 'Cross-country examples mirroring your request.',
      timeframe: buildTimeframe(entries),
      actionable: 'Compare how peers addressed similar challenges.',
      novelty: 0.35,
      items: entries
    });
  }

  if (collections.length === 0) {
    const entries = results.slice(0, 4).map(toCollectionEntry);
    collections.push({
      id: 'fallback-core',
      name: 'Core Reading',
      description: 'Essential sources surfaced by the current query.',
      timeframe: buildTimeframe(entries),
      novelty: 0.3,
      items: entries
    });
  }

  return collections.slice(0, 3);
}

/**
 * Convert result doc to collection entry
 */
function toCollectionEntry(doc: ScoredDocChunk): SmartCollectionEntry {
  const highlight = doc.text
    ? doc.text.slice(0, 160).replace(/\s+/g, ' ').trim() + '…'
    : doc.title;

  return {
    id: String(doc._id),
    title: doc.title,
    type: doc.type,
    url: doc.url,
    highlight,
    country: doc.country,
    year: doc.year
  };
}

/**
 * Build timeframe string from collection entries
 */
function buildTimeframe(entries: SmartCollectionEntry[]): string | undefined {
  const years = entries
    .map(entry => entry.year)
    .filter((year): year is number => typeof year === 'number');

  if (years.length === 0) return undefined;

  const newest = Math.max(...years);
  const oldest = Math.min(...years);

  if (newest === oldest) return String(newest);
  return `${oldest}–${newest}`;
}

/**
 * Normalize AI theme into title case without shouting
 */
function formatTitle(theme: string): string {
  const trimmed = theme.trim();
  if (!trimmed) return 'Contextual Collection';

  return trimmed
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Index documents by title for quick lookup
 */
function indexDocs(results: ScoredDocChunk[]): Map<string, ScoredDocChunk> {
  const map = new Map<string, ScoredDocChunk>();
  for (const doc of results) {
    map.set(doc.title, doc);
  }
  return map;
}
