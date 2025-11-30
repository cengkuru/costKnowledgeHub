import { Router, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ObjectId } from 'mongodb';
import { ragService, RAGFilters } from '../services/ragService';
import { THEMES, RESOURCE_TYPES, LANGUAGE_CODES, COUNTRY_PROGRAMS } from '../models/Resource';
import { feedbackService } from '../services/feedbackService';
import { faithfulnessService } from '../services/faithfulnessService';
import { intentService } from '../services/intentService';

// Simple wrapper for async error handling
const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// Request validation schema
const ChatRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  sessionId: z.string().min(1).max(200),
  filters: z.object({
    themes: z.array(z.enum(THEMES as unknown as [string, ...string[]])).optional(),
    resourceTypes: z.array(z.enum(RESOURCE_TYPES as unknown as [string, ...string[]])).optional(),
    language: z.enum(LANGUAGE_CODES as unknown as [string, ...string[]]).optional(),
    countryPrograms: z.array(z.enum(COUNTRY_PROGRAMS as unknown as [string, ...string[]])).optional()
  }).optional()
});

// Response schema (for documentation)
const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({
    resourceId: z.string(),
    resourceTitle: z.string(),
    chunkId: z.string(),
    excerpt: z.string(),
    url: z.string().url(),
    pageNumber: z.number().optional(),
    section: z.string().optional()
  })),
  confidence: z.enum(['high', 'medium', 'low', 'uncertain']),
  followUpQuestions: z.array(z.string()).optional()
});

/**
 * POST /api/chat
 * Main chat endpoint for Ask CoST feature
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validatedData = ChatRequestSchema.parse(req.body);

  const { query, sessionId, filters } = validatedData;

  // Call RAG service
  const response = await ragService.chat(query, sessionId, filters as RAGFilters);

  // Validate response
  ChatResponseSchema.parse(response);

  res.json(response);
}));

/**
 * POST /api/chat/context
 * Retrieve context only (for debugging/testing)
 */
router.post('/context', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    query: z.string().min(1).max(1000),
    topK: z.number().int().min(1).max(20).default(5),
    filters: z.object({
      themes: z.array(z.enum(THEMES as unknown as [string, ...string[]])).optional(),
      resourceTypes: z.array(z.enum(RESOURCE_TYPES as unknown as [string, ...string[]])).optional(),
      language: z.enum(LANGUAGE_CODES as unknown as [string, ...string[]]).optional()
    }).optional()
  });

  const { query, topK, filters } = schema.parse(req.body);

  const context = await ragService.retrieveContext(query, topK, filters as RAGFilters);

  res.json({
    query,
    topK,
    resultsCount: context.length,
    results: context
  });
}));

/**
 * POST /api/chat/:responseId/feedback
 * Submit feedback for a chat response
 */
router.post('/:responseId/feedback', asyncHandler(async (req: Request, res: Response) => {
  const feedbackSchema = z.object({
    sessionId: z.string().min(1).max(200),
    rating: z.enum(['helpful', 'not_helpful']).optional(),
    feedbackText: z.string().min(1).max(2000).optional(),
    userId: z.string().optional()
  });

  const { sessionId, rating, feedbackText, userId } = feedbackSchema.parse(req.body);
  const { responseId } = req.params;

  // Validate ObjectId
  if (!ObjectId.isValid(responseId)) {
    res.status(400).json({ error: 'Invalid response ID' });
    return;
  }

  const userIdObj = userId && ObjectId.isValid(userId) ? new ObjectId(userId) : undefined;
  const feedback = await feedbackService.submitFeedback(
    new ObjectId(responseId),
    sessionId,
    { rating, feedbackText },
    userIdObj
  );

  res.status(201).json({
    success: true,
    feedbackId: feedback._id,
    message: 'Feedback submitted successfully'
  });
}));

/**
 * POST /api/chat/:responseId/track
 * Track implicit signals (citation clicks, copy clicks, follow-ups)
 */
router.post('/:responseId/track', asyncHandler(async (req: Request, res: Response) => {
  const trackSchema = z.object({
    signalType: z.enum(['citation_click', 'copy_click', 'follow_up'])
  });

  const { signalType } = trackSchema.parse(req.body);
  const { responseId } = req.params;

  // Validate ObjectId
  if (!ObjectId.isValid(responseId)) {
    res.status(400).json({ error: 'Invalid response ID' });
    return;
  }

  const respId = new ObjectId(responseId);

  // Track the appropriate signal
  switch (signalType) {
    case 'citation_click':
      await feedbackService.trackCitationClick(respId);
      break;
    case 'copy_click':
      await feedbackService.trackCopyClick(respId);
      break;
    case 'follow_up':
      await feedbackService.trackFollowUp(respId);
      break;
  }

  res.json({
    success: true,
    message: `Tracked ${signalType} for response ${responseId}`
  });
}));

/**
 * GET /api/chat/feedback/stats
 * Get feedback statistics for a time period
 */
router.get('/feedback/stats', asyncHandler(async (req: Request, res: Response) => {
  const statsSchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  });

  const query = statsSchema.parse(req.query);

  // Default to last 7 days
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats = await feedbackService.getFeedbackStats({ from, to });

  res.json(stats);
}));

/**
 * POST /api/chat/:responseId/verify
 * Verify faithfulness of a response against sources
 */
router.post('/:responseId/verify', asyncHandler(async (req: Request, res: Response) => {
  const verifySchema = z.object({
    answer: z.string().min(1),
    sources: z.array(z.object({
      content: z.string()
    })).optional()
  });

  const { answer, sources } = verifySchema.parse(req.body);

  // Use provided sources or empty array
  const sourceChunks = sources || [];

  const result = await faithfulnessService.verifyFaithfulness(
    answer,
    sourceChunks as any
  );

  res.json(result);
}));

/**
 * POST /api/chat/classify-intent
 * Classify query intent
 */
router.post('/classify-intent', asyncHandler(async (req: Request, res: Response) => {
  const intentSchema = z.object({
    query: z.string().min(1).max(1000)
  });

  const { query } = intentSchema.parse(req.body);

  const classification = await intentService.classifyIntent(query);
  const handler = intentService.getHandler(classification.intent);

  res.json({
    classification,
    handler
  });
}));

/**
 * GET /api/chat/health
 * Health check endpoint
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  // Simple health check
  res.json({
    status: 'healthy',
    service: 'chat',
    timestamp: new Date().toISOString()
  });
}));

export default router;
