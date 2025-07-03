import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Enhanced CORS wrapper that handles authentication properly
 * This wrapper ensures OPTIONS requests bypass authentication
 */
export function corsEnabledFunction(
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    // Set CORS headers for all requests
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:5000',
      'https://knowledgehub-2ed2f.web.app',
      'https://knowledgehub-2ed2f.firebaseapp.com'
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      // For development/testing without origin
      res.set('Access-Control-Allow-Origin', '*');
    }

    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Max-Age', '3600');
    res.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS request - NO AUTHENTICATION
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      logger.error('Function error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };
}

/**
 * Verify admin authentication for protected endpoints
 * Returns null if authentication fails (response already sent)
 */
export async function verifyAdminAuth(
  req: Request,
  res: Response
): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Firebase ID token.'
    });
    return null;
  }
  
  const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check admin permissions
    if (!decodedToken.admin) {
      res.status(403).json({
        success: false,
        error: 'Permission denied. Only admin users can access this function.'
      });
      return null;
    }
    
    return decodedToken;
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
    return null;
  }
}