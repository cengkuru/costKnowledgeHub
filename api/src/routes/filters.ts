import { Router } from 'express';
import { getContextualFilterSuggestions } from '../services/contextual-filters.js';

export const filters = Router();

/**
 * GET /filters/contextual
 *
 * Returns AI-powered filter suggestions using query intent and corpus signals.
 */
filters.get('/contextual', async (req, res, next) => {
  try {
    const { q, topic, country, year } = req.query;

    if (!q || String(q).trim().length < 2) {
      return res.status(400).json({ error: 'Query (q) with at least 2 characters is required' });
    }

    const suggestions = await getContextualFilterSuggestions({
      q: String(q),
      topic: topic ? String(topic) : undefined,
      country: country ? String(country) : undefined,
      year: year ? Number(year) : undefined
    });

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});
