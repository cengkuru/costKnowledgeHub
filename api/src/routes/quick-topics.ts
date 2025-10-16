import { Router } from 'express';
import { generateQuickTopics, invalidateQuickTopicsCache } from '../services/quick-topics.service.js';

export const quickTopics = Router();

/**
 * GET /quick-topics
 * Returns AI-generated contextual quick topic shortcuts
 * These are short topic labels for quick navigation, not questions
 * Cached for 6 hours to optimize performance
 */
quickTopics.get('/', async (req, res) => {
  try {
    const topics = await generateQuickTopics();
    res.json({
      success: true,
      topics,  // Changed from 'questions' to 'topics'
      cached: true
    });
  } catch (error) {
    console.error('Error in quick topics endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quick topics'
    });
  }
});

/**
 * POST /quick-topics/refresh
 * Force refresh of quick topics cache
 * Useful for testing or manual updates
 */
quickTopics.post('/refresh', async (req, res) => {
  try {
    invalidateQuickTopicsCache();
    const topics = await generateQuickTopics();
    res.json({
      success: true,
      topics,  // Changed from 'questions' to 'topics'
      refreshed: true
    });
  } catch (error) {
    console.error('Error refreshing quick topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh quick topics'
    });
  }
});