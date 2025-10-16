import { ErrorRequestHandler } from 'express';
import { config } from '../config.js';

/**
 * Global error handler middleware
 * Catches all errors and returns a consistent error response
 *
 * In development: includes stack trace
 * In production: returns generic error message
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error caught by global handler:', err);

  const isDevelopment = config.nodeEnv === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};
