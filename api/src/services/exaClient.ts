import axios from 'axios';
import { config } from '../config.js';
import { ExaContentFragment, ExaResult } from '../types.js';

export type TemporalPreset = 'lastWeek' | 'lastMonth' | 'lastQuarter' | 'lastYear';

export interface ExaTemporalOptions {
  preset?: TemporalPreset;
  from?: string; // ISO date (YYYY-MM-DD) or month string (YYYY-MM)
  to?: string;
}

export interface ExaSearchOptions {
  numResults?: number;
  includeContent?: boolean;
  contentMaxCharacters?: number;
  temporal?: ExaTemporalOptions;
  sortBy?: 'relevance' | 'recent';
  includeDomains?: string[];
  excludeDomains?: string[];
  allowAllDomains?: boolean;
}

const normalizeDomains = (domains: readonly string[] | undefined): string[] =>
  (domains ?? [])
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean);

const matchesDomainList = (url: string, domains: string[]): boolean => {
  if (!domains.length) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return domains.some(domain => {
      const normalized = domain.startsWith('*.')
        ? domain.slice(2)
        : domain;
      return (
        hostname === normalized ||
        hostname.endsWith(`.${normalized}`)
      );
    });
  } catch {
    return false;
  }
};

const normalizeHighlights = (raw: unknown): ExaContentFragment[] | undefined => {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const normalized = raw
    .map<ExaContentFragment | null>((fragment, index) => {
      if (typeof fragment === 'string') {
        return { snippet: fragment, position: index };
      }
      if (fragment && typeof fragment === 'object') {
        const snippet =
          typeof (fragment as { snippet?: unknown }).snippet === 'string'
            ? (fragment as { snippet: string }).snippet
            : typeof (fragment as { text?: unknown }).text === 'string'
            ? (fragment as { text: string }).text
            : undefined;

        if (!snippet) {
          return null;
        }

        const rawPosition =
          typeof (fragment as { position?: unknown }).position === 'number'
            ? (fragment as { position: number }).position
            : typeof (fragment as { index?: unknown }).index === 'number'
            ? (fragment as { index: number }).index
            : undefined;

        const normalizedFragment: ExaContentFragment = {
          snippet,
          position: rawPosition ?? index
        };
        return normalizedFragment;
      }
      return null;
    })
    .filter((fragment): fragment is ExaContentFragment => fragment !== null);

  return normalized.length ? normalized : undefined;
};

const coerceDateString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const buildTemporalHint = (temporal?: ExaTemporalOptions): string | undefined => {
  if (!temporal) {
    return undefined;
  }

  if (temporal.from && temporal.to) {
    return `published:${temporal.from}..${temporal.to}`;
  }

  if (temporal.from) {
    return `published:${temporal.from}..`;
  }

  if (temporal.to) {
    return `published:..${temporal.to}`;
  }

  switch (temporal.preset) {
    case 'lastWeek':
      return 'published:past-7-days';
    case 'lastMonth':
      return 'published:past-30-days';
    case 'lastQuarter':
      return 'published:past-90-days';
    case 'lastYear':
      return 'published:past-365-days';
    default:
      return undefined;
  }
};

/**
 * Performs Exa search with optional temporal hints and controlled domain filtering.
 *
 * Supports:
 * - Temporal presets ("published:past-7-days") or explicit ranges
 * - Content retrieval for synthesis workflows
 * - Flexible domain strategies (allowlist, inclusive, exclusions)
 */
export const exaSearch = async (
  query: string,
  options: ExaSearchOptions = {}
): Promise<ExaResult[]> => {
  const {
    numResults = 5,
    includeContent = false,
    contentMaxCharacters,
    temporal,
    sortBy,
    includeDomains,
    excludeDomains,
    allowAllDomains = false
  } = options;

  const temporalHint = buildTemporalHint(temporal);
  const finalQuery = [query.trim(), temporalHint]
    .filter(Boolean)
    .join(' ')
    .trim();

  const baseAllowlist = normalizeDomains(config.domainAllowlist);
  const effectiveAllowlist = allowAllDomains
    ? []
    : Array.from(
        new Set([
          ...baseAllowlist,
          ...normalizeDomains(includeDomains)
        ])
      );

  const requestBody: Record<string, unknown> = {
    query: finalQuery,
    numResults,
    useAutoprompt: false,
    type: 'keyword'
  };

  if (!allowAllDomains && effectiveAllowlist.length > 0) {
    requestBody.includeDomains = effectiveAllowlist;
  }

  const normalizedExclude = normalizeDomains(excludeDomains);
  if (normalizedExclude.length) {
    requestBody.excludeDomains = normalizedExclude;
  }

  const resolvedSort = sortBy || (temporal ? 'recent' : undefined);
  if (resolvedSort) {
    requestBody.sortBy = resolvedSort;
  }

  if (includeContent) {
    requestBody.contents = {
      includeHtml: false,
      maxCharacters: contentMaxCharacters ?? 1_600
    };
  }

  try {
    const response = await axios.post<{ results: ExaResult[] }>(
      'https://api.exa.ai/search',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${config.exaApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 12_000
      }
    );

    const results = response.data.results ?? [];
    const filtered = results.filter(result => {
      if (!result.url) {
        return false;
      }

      if (normalizedExclude.length && matchesDomainList(result.url, normalizedExclude)) {
        return false;
      }

      if (allowAllDomains || effectiveAllowlist.length === 0) {
        return true;
      }

      return matchesDomainList(result.url, effectiveAllowlist);
    });

    const normalizedResults = filtered.map(result => {
      const highlights = normalizeHighlights((result as { highlights?: unknown }).highlights);
      const rawSnippet = (result as { snippet?: unknown }).snippet;

      const fallbackText =
        typeof result.text === 'string' && result.text.trim()
          ? result.text
          : typeof rawSnippet === 'string' && rawSnippet.trim()
          ? rawSnippet
          : highlights?.[0]?.snippet;

      const publishedDate =
        coerceDateString(result.publishedDate) ??
        coerceDateString((result as { published_at?: unknown }).published_at) ??
        coerceDateString((result as { published?: unknown }).published);

      return {
        ...result,
        publishedDate,
        text: fallbackText,
        highlights
      };
    });

    return normalizedResults;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Exa API error:', error.response?.data || error.message);
      throw new Error(`Exa search failed: ${error.message}`);
    }
    throw error;
  }
};
