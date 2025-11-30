import { Request, Response, NextFunction } from 'express';
import { searchService, SearchRequest, SearchResponse } from '../services/searchService';
import { z } from 'zod';

const SearchBodySchema = z.object({
  query: z.string().min(1),
  filters: z.object({
    resourceTypes: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
    countryPrograms: z.array(z.string()).optional(),
    language: z.string().optional(),
    audience: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).optional(),
  }).optional(),
  sort: z.enum(['relevance', 'date', 'popularity']).optional().default('relevance'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const searchController = {
  /**
   * POST /api/search
   * Hybrid search combining keyword and semantic search
   */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = SearchBodySchema.parse(req.body);

      // Convert string dates to Date objects if present
      const filters = validatedData.filters ? {
        ...validatedData.filters,
        dateRange: validatedData.filters.dateRange ? {
          from: validatedData.filters.dateRange.from ? new Date(validatedData.filters.dateRange.from) : undefined,
          to: validatedData.filters.dateRange.to ? new Date(validatedData.filters.dateRange.to) : undefined,
        } : undefined,
      } : undefined;

      const searchRequest: SearchRequest = {
        query: validatedData.query,
        filters: filters as any,
        sort: validatedData.sort,
        page: validatedData.page,
        limit: validatedData.limit,
      };

      const results: SearchResponse = await searchService.search(searchRequest);

      res.json(results);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/search/keyword
   * Keyword search using text index
   */
  async keywordSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

      const results = await searchService.keywordSearch(query);

      res.json({
        results: results.map(r => ({
          resource: r.resource,
          score: r.score,
          highlights: r.highlights,
        })),
        total: results.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/search/semantic
   * Semantic search using embeddings
   */
  async semanticSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

      const results = await searchService.semanticSearch(query);

      res.json({
        results: results.map(r => ({
          resource: r.resource,
          score: r.score,
          highlights: r.highlights,
        })),
        total: results.length,
      });
    } catch (error) {
      next(error);
    }
  },
};
