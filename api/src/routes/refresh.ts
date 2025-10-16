import { Router } from 'express';
import { validateQuery } from '../middlewares/validateQuery.js';
import { searchLimiter } from '../middlewares/rateLimit.js';
import { exaSearch } from '../services/exaClient.js';
import { synthesizeAnswer } from '../services/answer.js';
import { SearchResponse, SearchFilters } from '../types.js';

export const refresh = Router();

/**
 * GET /refresh
 *
 * Live refresh endpoint - performs real-time Exa search on allowed domains
 *
 * Query params:
 * - q: Search query (required, min 2 chars)
 *
 * Response:
 * {
 *   answer: [{ text: string, cites: [{ title, url }] }],
 *   items: [{ id, title, type: 'External', summary, url }]
 *   page: number
 *   pageSize: number
 *   hasMore: boolean
 * }
 *
 * Features:
 * - NO cache (intentionally fresh)
 * - Domain-restricted to CoST & ITI sites
 * - Returns latest content from the web
 * - Items marked as "External" (not yet in index)
 *
 * Use case: User clicks "Refresh from Source" to get newest info
 */
refresh.get('/', searchLimiter, validateQuery, async (req, res, next) => {
  try {
    const { q } = req.query as unknown as SearchFilters;

    // Perform live Exa search
    const exaResults = await exaSearch(String(q), { numResults: 5 });

    // Build snippets from Exa results
    // Note: If your Exa plan includes content retrieval, use that
    // Otherwise, use title + URL as fallback
    const snippets = exaResults.map(r => ({
      title: r.title,
      url: r.url,
      text: r.text || `See: ${r.url}`
    }));

    // Synthesize answer from fresh snippets
    const answerPayload = await synthesizeAnswer(String(q), snippets);

    // Format response
    const response: SearchResponse = {
      answer: answerPayload.answer,
      items: exaResults.map(r => ({
        id: r.url,  // Use URL as ID for external results
        title: r.title,
        type: 'External',  // Mark as not yet in index
        summary: (r.text || '').slice(0, 180) + ((r.text?.length || 0) > 180 ? '…' : ''),
        url: r.url
      })),
      page: 1,
      pageSize: exaResults.length,
      hasMore: false
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});
