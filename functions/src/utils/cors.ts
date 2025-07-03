import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

/**
 * CORS Configuration for Firebase Cloud Functions
 * Handles both development (localhost) and production domains
 */
export const CORS_CONFIG = {
  // Allow these origins for CORS
  allowedOrigins: [
    'http://localhost:4200',           // Angular development server
    'http://localhost:5000',           // Firebase hosting emulator
    'https://knowledgehub-2ed2f.web.app',      // Firebase hosting production
    'https://knowledgehub-2ed2f.firebaseapp.com' // Firebase hosting alternative
  ],
  
  // Default headers
  defaultHeaders: {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true'
  }
};

/**
 * Set CORS headers based on request origin
 */
export function setCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && CORS_CONFIG.allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests without origin (like direct function calls)
    res.set('Access-Control-Allow-Origin', '*');
  }
  
  // Set default CORS headers
  Object.entries(CORS_CONFIG.defaultHeaders).forEach(([key, value]) => {
    res.set(key, value);
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPrelight(req: Request, res: Response): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).send('');
    return true;
  }
  return false;
}

/**
 * CORS middleware wrapper for Firebase Functions
 */
export function withCors<T extends any[]>(
  handler: (req: Request, res: Response, ...args: T) => Promise<void> | void
) {
  return async (req: Request, res: Response, ...args: T): Promise<void> => {
    // Handle preflight
    if (handleCorsPrelight(req, res)) {
      return;
    }
    
    // Set CORS headers for actual request
    setCorsHeaders(req, res);
    
    // Call the actual handler
    await handler(req, res, ...args);
  };
}

/**
 * Extract and validate Firebase ID token from Authorization header
 */
export function extractIdToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Send JSON error response with CORS headers
 */
export function sendErrorResponse(
  res: Response, 
  statusCode: number, 
  error: string, 
  details?: any
): void {
  res.status(statusCode).json({
    success: false,
    error,
    details: details || undefined
  });
}

/**
 * Send JSON success response with CORS headers
 */
export function sendSuccessResponse(
  res: Response, 
  data: any, 
  message?: string
): void {
  res.status(200).json({
    success: true,
    data,
    message: message || undefined
  });
}