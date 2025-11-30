import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Usage Event Types
 * Tracks all user interactions with the platform
 */
export const EVENT_TYPES = [
  // Page/View Events
  'page_view',           // User viewed a page
  'resource_view',       // User viewed a resource detail
  'resource_click',      // User clicked external resource link

  // Search Events
  'search',              // User performed a search
  'search_result_click', // User clicked a search result

  // Chat/AI Events
  'chat_message',        // User sent a chat message
  'chat_response',       // AI responded to chat

  // Admin Events
  'admin_login',         // Admin logged in
  'admin_action',        // Admin performed an action

  // Resource Management
  'resource_create',     // Resource was created
  'resource_update',     // Resource was updated
  'resource_delete',     // Resource was deleted

  // User Events
  'user_register',       // New user registered
  'user_login',          // User logged in

  // API Events
  'api_request',         // General API request

  // Discovery Events
  'discovery_run',       // Discovery job ran
  'discovery_approve',   // Discovery resource approved
  'discovery_reject',    // Discovery resource rejected
] as const;

export type EventType = typeof EVENT_TYPES[number];

/**
 * Usage Event Schema
 */
export const UsageEventSchema = z.object({
  // Event identification
  eventType: z.enum(EVENT_TYPES),

  // Timestamp (optional - will be set by service if not provided)
  timestamp: z.date().optional(),

  // User context (optional - for anonymous tracking)
  userId: z.string().optional(),
  sessionId: z.string().optional(),

  // Request context
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  referer: z.string().optional(),

  // Event-specific data
  metadata: z.record(z.string(), z.any()).optional(),

  // Resource context (for resource-related events)
  resourceId: z.string().optional(),
  resourceTitle: z.string().optional(),

  // Search context (for search events)
  searchQuery: z.string().optional(),
  searchResultCount: z.number().optional(),

  // Page context
  page: z.string().optional(),

  // Performance metrics
  responseTimeMs: z.number().optional(),

  // Geographic data (derived from IP)
  country: z.string().optional(),
  city: z.string().optional(),
});

export type UsageEventInput = z.infer<typeof UsageEventSchema>;

/**
 * Usage Event Document (stored in MongoDB)
 */
export interface UsageEvent extends UsageEventInput {
  _id?: ObjectId;
}

/**
 * Aggregated Stats Interfaces
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  pageViews: number;
  searches: number;
  resourceViews: number;
  resourceClicks: number;
  chatMessages: number;
  apiRequests: number;
}

export interface EventBreakdown {
  eventType: EventType;
  count: number;
  percentage: number;
}

export interface TopResource {
  resourceId: string;
  resourceTitle: string;
  views: number;
  clicks: number;
}

export interface TopSearch {
  query: string;
  count: number;
  avgResults: number;
}

export interface UsageAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    uniqueSessions: number;
    avgEventsPerUser: number;
    avgEventsPerSession: number;
  };
  eventBreakdown: EventBreakdown[];
  dailyStats: DailyStats[];
  topResources: TopResource[];
  topSearches: TopSearch[];
  peakHours: { hour: number; count: number }[];
}

export const USAGE_EVENTS_COLLECTION = 'usage_events';
