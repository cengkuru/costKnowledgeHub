import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Rate limiter for search endpoints
 * Prevents abuse by limiting requests per IP address
 *
 * Default: 60 requests per minute (1 req/second average)
 */
export const searchLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 'Check the RateLimit-Reset header for retry time'
  }
});
