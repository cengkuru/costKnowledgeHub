import { z } from 'zod';
import { RequestHandler } from 'express';

/**
 * Zod schema for search query validation
 * Ensures all required fields are present and properly typed
 */
const searchSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  topic: z.string().optional(),
  country: z.string().optional(),
  year: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1).optional()
});

/**
 * Express middleware to validate search query parameters
 * Returns 400 error with detailed validation issues on failure
 */
export const validateQuery: RequestHandler = (req, res, next) => {
  const result = searchSchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      issues: result.error.format()
    });
  }

  // Replace req.query with validated and typed data
  req.query = result.data as any;
  next();
};
