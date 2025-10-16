import { Router } from 'express';
import { generateStarterQuestions, invalidateStarterQuestionsCache } from '../services/starter-questions.service.js';

export const starterQuestions = Router();

/**
 * GET /starter-questions
 * Returns AI-generated contextual starter questions
 * Cached for 6 hours to optimize performance
 */
starterQuestions.get('/', async (req, res) => {
  try {
    const questions = await generateStarterQuestions();
    res.json({
      success: true,
      questions,
      cached: true
    });
  } catch (error) {
    console.error('Error in starter questions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate starter questions'
    });
  }
});

/**
 * POST /starter-questions/refresh
 * Force refresh of starter questions cache
 * Useful for testing or manual updates
 */
starterQuestions.post('/refresh', async (req, res) => {
  try {
    invalidateStarterQuestionsCache();
    const questions = await generateStarterQuestions();
    res.json({
      success: true,
      questions,
      refreshed: true
    });
  } catch (error) {
    console.error('Error refreshing starter questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh starter questions'
    });
  }
});
