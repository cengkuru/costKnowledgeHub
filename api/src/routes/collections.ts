import { Router } from 'express';
import { buildSmartCollections } from '../services/smart-collections.js';

export const collections = Router();

/**
 * GET /collections/smart
 *
 * Returns AI-curated smart collections for the current query context.
 */
collections.get('/smart', async (req, res, next) => {
  try {
    const { q, topic, country, year } = req.query;

    if (!q || String(q).trim().length < 2) {
      return res.status(400).json({ error: 'Query (q) with at least 2 characters is required' });
    }

    const smartCollections = await buildSmartCollections({
      q: String(q),
      topic: topic ? String(topic) : undefined,
      country: country ? String(country) : undefined,
      year: year ? Number(year) : undefined
    });

    res.json({ collections: smartCollections });
  } catch (error) {
    next(error);
  }
});
