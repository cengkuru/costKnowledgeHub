import { Router } from 'express';
import { validateQuery } from '../middlewares/validateQuery.js';
import { searchLimiter } from '../middlewares/rateLimit.js';
import { embed } from '../services/embedder.js';
import { vectorSearch } from '../services/vectorStore.js';
import { synthesizeAnswer } from '../services/answer.js';
import { generateSummaries } from '../services/summarizer.js';
import { cache } from '../services/cache.js';
import { SearchResponse, SearchFilters } from '../types.js';

export const search = Router();
const PAGE_SIZE = 10;

/**
 * GET /search
 *
 * Primary RAG endpoint - searches indexed corpus via MongoDB Atlas Vector Search
 *
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - topic: Document type filter (optional)
 * - country: Country filter (optional)
 * - year: Year filter (exact year, optional)
 * - yearFrom: Date range start (optional)
 * - yearTo: Date range end (optional)
 * - sortBy: 'relevance' | 'date' (optional, default: relevance)
 * - page: Pagination (optional, default: 1)
 *
 * Response:
 * {
 *   answer: [{ text: string, cites: [{ title, url }] }],
 *   items: [{ id, title, type, summary, country, year, url }]
 *   page: number
 *   pageSize: number
 *   hasMore: boolean
 * }
 *
 * Features:
 * - 60s LRU cache for fast responses
 * - Metadata filtering (type, country, year)
 * - Gemini Flash synthesis with section-level citations
 */
search.get('/', searchLimiter, validateQuery, async (req, res, next) => {
  try {
    const filters = req.query as unknown as SearchFilters;
    const { q, topic, country, year, yearFrom, yearTo, sortBy, page: rawPage } = filters;
    const page = Math.max(Number(rawPage) || 1, 1);

    // Detect "latest" queries and auto-enable date sorting
    const queryLower = String(q).toLowerCase();
    const isLatestQuery = queryLower.includes('latest') ||
                          queryLower.includes('recent') ||
                          queryLower.includes('new');
    const effectiveSortBy = sortBy || (isLatestQuery ? 'date' : 'relevance');

    const cacheKey = [
      'search',
      q,
      topic ?? '',
      country ?? '',
      year ?? '',
      yearFrom ?? '',
      yearTo ?? '',
      effectiveSortBy,
      page
    ].join('|');

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Generate query embedding
    const qEmbedding = await embed(String(q)) as number[];

    // Build metadata filters
    const metadataFilters: Record<string, unknown> = {};
    if (topic) metadataFilters.type = topic;
    if (country) metadataFilters.country = country;

    // Date filtering: exact year, or date range
    if (year) {
      metadataFilters.year = Number(year);
    } else if (yearFrom || yearTo) {
      const dateFilter: Record<string, number> = {};
      if (yearFrom) dateFilter.$gte = Number(yearFrom);
      if (yearTo) dateFilter.$lte = Number(yearTo);
      if (Object.keys(dateFilter).length > 0) {
        metadataFilters.year = dateFilter;
      }
    }

    const offset = (page - 1) * PAGE_SIZE;

    // Perform vector search
    const { results: hits, hasMore } = await vectorSearch({
      qEmbedding,
      limit: PAGE_SIZE,
      offset,
      filters: metadataFilters
    });

    // Prepare snippets for answer synthesis
    const snippets = hits.map(h => ({
      title: h.title,
      url: h.url,
      text: h.text
    }));

    // Synthesize answer with citations (parallel with summaries)
    const [answerPayload, summaries] = await Promise.all([
      synthesizeAnswer(String(q), snippets),
      generateSummaries(hits.map(h => ({
        title: h.title,
        text: h.text || '',
        type: h.type
      })))
    ]);

    // Format response with AI-generated summaries
    const response: SearchResponse = {
      answer: answerPayload.answer,
      items: hits.map((h, i) => ({
        id: String(h._id),
        title: h.title,
        type: h.type,
        summary: summaries[i]?.summary || h.title,  // Fallback to title if summary fails
        country: h.country,
        year: h.year,
        url: h.url
      })),
      page,
      pageSize: PAGE_SIZE,
      hasMore
    };

    // Cache result
    cache.set(cacheKey, response);

    res.json(response);
  } catch (error) {
    next(error);
  }
});
