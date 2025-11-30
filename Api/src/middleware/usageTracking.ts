/**
 * Usage Tracking Middleware
 * Automatically tracks API requests and user interactions
 */

import { Request, Response, NextFunction } from 'express';
import { usageTrackingService } from '../services/usageTrackingService';

// Endpoints to exclude from tracking (to avoid noise)
const EXCLUDED_ENDPOINTS = [
  '/api/health',
  '/api/admin/usage', // Don't track analytics queries
];

// IPs to exclude (localhost, development)
const EXCLUDED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '::ffff:127.0.0.1',
];

// Simple in-memory deduplication cache (5 minute window)
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Check if this is a localhost/development request
 */
function isLocalhost(ip: string | undefined): boolean {
  if (!ip) return false;
  return EXCLUDED_IPS.some(excluded => ip.includes(excluded));
}

/**
 * Check if event should be deduplicated
 * Returns true if this is a duplicate
 */
function isDuplicate(eventKey: string): boolean {
  const now = Date.now();
  const lastSeen = recentEvents.get(eventKey);

  if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return true; // Duplicate within window
  }

  recentEvents.set(eventKey, now);
  return false;
}

// Endpoints that are high-value and should be tracked with more detail
const HIGH_VALUE_ENDPOINTS = [
  '/api/search',
  '/api/resources',
  '/api/chat',
];

/**
 * Extract session ID from request
 * Uses a cookie or generates from IP + User-Agent
 */
function getSessionId(req: Request): string {
  // Check for session cookie
  const sessionCookie = req.cookies?.sessionId;
  if (sessionCookie) {
    return sessionCookie;
  }

  // Generate a pseudo-session from IP + User-Agent
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  const hash = Buffer.from(`${ip}:${userAgent}`).toString('base64').substring(0, 20);
  return `anon_${hash}`;
}

/**
 * Middleware to track API usage
 */
export function trackApiUsage(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  const ip = req.ip || req.socket.remoteAddress;

  // Skip excluded endpoints
  if (EXCLUDED_ENDPOINTS.some(ep => path.startsWith(ep))) {
    return next();
  }

  // Skip localhost in production
  if (process.env.NODE_ENV === 'production' && isLocalhost(ip)) {
    return next();
  }

  const startTime = Date.now();

  // Capture response finish
  res.on('finish', async () => {
    const responseTimeMs = Date.now() - startTime;

    // Skip OPTIONS requests
    if (req.method === 'OPTIONS') return;

    // Skip if duplicate (same session + endpoint within 5 min)
    const sessionId = getSessionId(req);
    const dedupKey = `api:${sessionId}:${req.method}:${path}`;
    if (isDuplicate(dedupKey)) return;

    // Don't await - fire and forget
    usageTrackingService.trackApiRequest(
      path,
      req.method,
      responseTimeMs,
      {
        userId: (req as any).user?.id,
        sessionId,
        ipAddress: ip,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
      }
    ).catch(err => console.error('[UsageTracking] Track error:', err));
  });

  next();
}

/**
 * Middleware to track search events with more detail
 */
export function trackSearchUsage(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress;

  // Skip localhost in production
  if (process.env.NODE_ENV === 'production' && isLocalhost(ip)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Track search after response is ready
    if (req.body?.query || req.query?.q) {
      const query = req.body?.query || req.query?.q as string;
      const resultCount = body?.data?.length || body?.results?.length || 0;
      const sessionId = getSessionId(req);

      // Deduplicate same search query within window
      const dedupKey = `search:${sessionId}:${query.toLowerCase().trim()}`;
      if (!isDuplicate(dedupKey)) {
        usageTrackingService.trackSearch(
          query,
          resultCount,
          {
            userId: (req as any).user?.id,
            sessionId,
            ipAddress: ip,
            metadata: {
              filters: req.body?.filters || req.query,
              semantic: req.query?.semantic === 'true' || req.body?.semantic,
            },
          }
        ).catch(err => console.error('[UsageTracking] Search track error:', err));
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Middleware to track resource views
 */
export function trackResourceViewUsage(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress;

  // Skip localhost in production
  if (process.env.NODE_ENV === 'production' && isLocalhost(ip)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Track resource view if we have resource data
    if (body?._id && body?.title && res.statusCode === 200) {
      const sessionId = getSessionId(req);
      const resourceId = body._id.toString();

      // Deduplicate same resource view within window
      const dedupKey = `resource:${sessionId}:${resourceId}`;
      if (!isDuplicate(dedupKey)) {
        usageTrackingService.trackResourceView(
          resourceId,
          body.title,
          {
            userId: (req as any).user?.id,
            sessionId,
            ipAddress: ip,
            userAgent: req.get('user-agent'),
          }
        ).catch(err => console.error('[UsageTracking] Resource view track error:', err));
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Track admin login
 */
export async function trackLogin(
  userId: string,
  isAdmin: boolean,
  req: Request
): Promise<void> {
  const trackFn = isAdmin
    ? usageTrackingService.trackAdminLogin
    : usageTrackingService.trackUserLogin;

  await trackFn(userId, {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });
}

/**
 * Track chat message
 */
export async function trackChatMessage(req: Request): Promise<void> {
  await usageTrackingService.trackChatMessage({
    userId: (req as any).user?.id,
    sessionId: getSessionId(req),
    ipAddress: req.ip || req.socket.remoteAddress,
    metadata: {
      messageLength: req.body?.message?.length || 0,
    },
  });
}
