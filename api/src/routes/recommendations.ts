import { Router } from 'express';
import { recommendationEngine } from '../services/recommendation-engine.js';

export const recommendations = Router();

/**
 * GET /recommendations
 *
 * AI-Native intelligent recommendations endpoint
 *
 * Query params:
 * - query: Current search query (optional)
 * - selectedIds: Comma-separated list of selected document IDs (optional)
 * - answerText: Text from AI answer bullets (optional)
 * - limit: Number of recommendations (default: 5)
 *
 * Response:
 * {
 *   recommendations: [
 *     {
 *       id: string,
 *       title: string,
 *       type: string,
 *       url: string,
 *       relevanceScore: number,
 *       reason: string
 *     }
 *   ]
 * }
 *
 * Features:
 * - Vector-based similarity matching
 * - Context-aware (query + selections + answer)
 * - Diverse recommendations (different types)
 * - Fallback to curated resources
 */
recommendations.get('/', async (req, res, next) => {
  try {
    const { query, selectedIds, answerText, limit, topic, country, year } = req.query;

    // Parse selectedIds from comma-separated string
    const parsedSelectedIds = selectedIds
      ? String(selectedIds).split(',').filter(Boolean)
      : undefined;

    // Parse limit
    const parsedLimit = limit ? Math.min(Number(limit), 10) : 5;

    // Generate recommendations
    const results = await recommendationEngine.getRecommendations({
      query: query ? String(query) : undefined,
      selectedIds: parsedSelectedIds,
      answerText: answerText ? String(answerText) : undefined,
      filters: {
        topic: topic ? String(topic) : undefined,
        country: country ? String(country) : undefined,
        year: year ? Number(year) : undefined
      },
      limit: parsedLimit
    });

    res.json({ recommendations: results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /recommendations/complementary
 *
 * Get complementary documents for selected items
 * E.g., "Users who selected X also selected Y"
 *
 * Query params:
 * - selectedIds: Comma-separated list of selected document IDs (required)
 * - limit: Number of recommendations (default: 3)
 *
 * Response:
 * {
 *   complementary: [
 *     {
 *       id: string,
 *       title: string,
 *       type: string,
 *       url: string,
 *       relevanceScore: number,
 *       reason: string
 *     }
 *   ]
 * }
 */
recommendations.get('/complementary', async (req, res, next) => {
  try {
    const { selectedIds, limit } = req.query;

    if (!selectedIds) {
      return res.status(400).json({ error: 'selectedIds is required' });
    }

    // Parse selectedIds from comma-separated string
    const parsedSelectedIds = String(selectedIds).split(',').filter(Boolean);

    if (parsedSelectedIds.length === 0) {
      return res.status(400).json({ error: 'At least one selectedId is required' });
    }

    // Parse limit
    const parsedLimit = limit ? Math.min(Number(limit), 5) : 3;

    // Get complementary recommendations
    const results = await recommendationEngine.getComplementary(
      parsedSelectedIds,
      parsedLimit
    );

    res.json({ complementary: results });
  } catch (error) {
    next(error);
  }
});
