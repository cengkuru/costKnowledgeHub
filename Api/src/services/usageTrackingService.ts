/**
 * Usage Tracking Service
 * Tracks user interactions and generates analytics
 */

import { getDatabase } from '../db';
import {
  UsageEvent,
  UsageEventInput,
  EventType,
  DailyStats,
  EventBreakdown,
  TopResource,
  TopSearch,
  UsageAnalytics,
  USAGE_EVENTS_COLLECTION,
} from '../models/UsageEvent';

/**
 * Track a usage event
 */
async function trackEvent(event: UsageEventInput): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UsageEvent>(USAGE_EVENTS_COLLECTION);

    await collection.insertOne({
      ...event,
      timestamp: event.timestamp || new Date(),
    });
  } catch (error) {
    // Log but don't throw - tracking should never break the app
    console.error('[UsageTracking] Failed to track event:', error);
  }
}

/**
 * Track a page view
 */
async function trackPageView(
  page: string,
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'page_view',
    page,
    ...options,
  });
}

/**
 * Track a resource view
 */
async function trackResourceView(
  resourceId: string,
  resourceTitle: string,
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'resource_view',
    resourceId,
    resourceTitle,
    ...options,
  });
}

/**
 * Track a resource click (external link)
 */
async function trackResourceClick(
  resourceId: string,
  resourceTitle: string,
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'resource_click',
    resourceId,
    resourceTitle,
    ...options,
  });
}

/**
 * Track a search
 */
async function trackSearch(
  query: string,
  resultCount: number,
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'search',
    searchQuery: query,
    searchResultCount: resultCount,
    ...options,
  });
}

/**
 * Track a chat message
 */
async function trackChatMessage(
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'chat_message',
    ...options,
  });
}

/**
 * Track an admin action
 */
async function trackAdminAction(
  action: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackEvent({
    eventType: 'admin_action',
    userId,
    metadata: {
      action,
      ...metadata,
    },
  });
}

/**
 * Track an API request
 */
async function trackApiRequest(
  endpoint: string,
  method: string,
  responseTimeMs: number,
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    statusCode?: number;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'api_request',
    page: endpoint,
    responseTimeMs,
    metadata: {
      method,
      statusCode: options?.statusCode,
    },
    ...options,
  });
}

/**
 * Track user login
 */
async function trackUserLogin(
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'user_login',
    userId,
    ...options,
  });
}

/**
 * Track admin login
 */
async function trackAdminLogin(
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'admin_login',
    userId,
    ...options,
  });
}

// ============ Analytics Functions ============

/**
 * Get usage analytics for a date range
 */
async function getAnalytics(
  startDate: Date,
  endDate: Date
): Promise<UsageAnalytics> {
  const db = await getDatabase();
  const collection = db.collection<UsageEvent>(USAGE_EVENTS_COLLECTION);

  const dateFilter = {
    timestamp: { $gte: startDate, $lte: endDate },
  };

  // Get summary stats
  const summaryPipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
      },
    },
    {
      $project: {
        totalEvents: 1,
        uniqueUsers: { $size: { $filter: { input: '$uniqueUsers', as: 'u', cond: { $ne: ['$$u', null] } } } },
        uniqueSessions: { $size: { $filter: { input: '$uniqueSessions', as: 's', cond: { $ne: ['$$s', null] } } } },
      },
    },
  ];

  const summaryResult = await collection.aggregate(summaryPipeline).toArray();
  const summary = summaryResult[0] || { totalEvents: 0, uniqueUsers: 0, uniqueSessions: 0 };

  // Get event breakdown
  const breakdownPipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ];

  const breakdownResult = await collection.aggregate(breakdownPipeline).toArray();
  const eventBreakdown: EventBreakdown[] = breakdownResult.map((item: any) => ({
    eventType: item._id as EventType,
    count: item.count,
    percentage: summary.totalEvents > 0 ? Math.round((item.count / summary.totalEvents) * 100) : 0,
  }));

  // Get daily stats
  const dailyPipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        totalEvents: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        pageViews: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } },
        searches: { $sum: { $cond: [{ $eq: ['$eventType', 'search'] }, 1, 0] } },
        resourceViews: { $sum: { $cond: [{ $eq: ['$eventType', 'resource_view'] }, 1, 0] } },
        resourceClicks: { $sum: { $cond: [{ $eq: ['$eventType', 'resource_click'] }, 1, 0] } },
        chatMessages: { $sum: { $cond: [{ $eq: ['$eventType', 'chat_message'] }, 1, 0] } },
        apiRequests: { $sum: { $cond: [{ $eq: ['$eventType', 'api_request'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const dailyResult = await collection.aggregate(dailyPipeline).toArray();
  const dailyStats: DailyStats[] = dailyResult.map((item: any) => ({
    date: item._id,
    totalEvents: item.totalEvents,
    uniqueUsers: item.uniqueUsers.filter((u: any) => u !== null).length,
    uniqueSessions: item.uniqueSessions.filter((s: any) => s !== null).length,
    pageViews: item.pageViews,
    searches: item.searches,
    resourceViews: item.resourceViews,
    resourceClicks: item.resourceClicks,
    chatMessages: item.chatMessages,
    apiRequests: item.apiRequests,
  }));

  // Get top resources
  const topResourcesPipeline = [
    {
      $match: {
        ...dateFilter,
        eventType: { $in: ['resource_view', 'resource_click'] },
        resourceId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$resourceId',
        resourceTitle: { $first: '$resourceTitle' },
        views: { $sum: { $cond: [{ $eq: ['$eventType', 'resource_view'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'resource_click'] }, 1, 0] } },
      },
    },
    { $sort: { views: -1, clicks: -1 } },
    { $limit: 10 },
  ];

  const topResourcesResult = await collection.aggregate(topResourcesPipeline).toArray();
  const topResources: TopResource[] = topResourcesResult.map((item: any) => ({
    resourceId: item._id,
    resourceTitle: item.resourceTitle || 'Unknown',
    views: item.views,
    clicks: item.clicks,
  }));

  // Get top searches
  const topSearchesPipeline = [
    {
      $match: {
        ...dateFilter,
        eventType: 'search',
        searchQuery: { $ne: null },
      },
    },
    {
      $group: {
        _id: { $toLower: '$searchQuery' },
        count: { $sum: 1 },
        avgResults: { $avg: '$searchResultCount' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ];

  const topSearchesResult = await collection.aggregate(topSearchesPipeline).toArray();
  const topSearches: TopSearch[] = topSearchesResult.map((item: any) => ({
    query: item._id,
    count: item.count,
    avgResults: Math.round(item.avgResults || 0),
  }));

  // Get peak hours
  const peakHoursPipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: { $hour: '$timestamp' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const peakHoursResult = await collection.aggregate(peakHoursPipeline).toArray();
  const peakHours = peakHoursResult.map((item: any) => ({
    hour: item._id,
    count: item.count,
  }));

  return {
    period: { start: startDate, end: endDate },
    summary: {
      totalEvents: summary.totalEvents,
      uniqueUsers: summary.uniqueUsers,
      uniqueSessions: summary.uniqueSessions,
      avgEventsPerUser: summary.uniqueUsers > 0 ? Math.round(summary.totalEvents / summary.uniqueUsers) : 0,
      avgEventsPerSession: summary.uniqueSessions > 0 ? Math.round(summary.totalEvents / summary.uniqueSessions) : 0,
    },
    eventBreakdown,
    dailyStats,
    topResources,
    topSearches,
    peakHours,
  };
}

/**
 * Get quick stats for dashboard
 */
async function getQuickStats(): Promise<{
  today: { events: number; users: number; searches: number };
  thisWeek: { events: number; users: number; searches: number };
  thisMonth: { events: number; users: number; searches: number };
}> {
  const db = await getDatabase();
  const collection = db.collection<UsageEvent>(USAGE_EVENTS_COLLECTION);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const getStats = async (startDate: Date) => {
    const pipeline = [
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          events: { $sum: 1 },
          users: { $addToSet: '$userId' },
          searches: { $sum: { $cond: [{ $eq: ['$eventType', 'search'] }, 1, 0] } },
        },
      },
    ];

    const result = await collection.aggregate(pipeline).toArray();
    const data = result[0] || { events: 0, users: [], searches: 0 };
    return {
      events: data.events,
      users: data.users.filter((u: any) => u !== null).length,
      searches: data.searches,
    };
  };

  const [today, thisWeek, thisMonth] = await Promise.all([
    getStats(todayStart),
    getStats(weekStart),
    getStats(monthStart),
  ]);

  return { today, thisWeek, thisMonth };
}

/**
 * Get real-time activity (last N events)
 */
async function getRecentActivity(limit: number = 50): Promise<UsageEvent[]> {
  const db = await getDatabase();
  const collection = db.collection<UsageEvent>(USAGE_EVENTS_COLLECTION);

  return await collection
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Ensure indexes for efficient querying
 */
async function ensureIndexes(): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection<UsageEvent>(USAGE_EVENTS_COLLECTION);

  await collection.createIndexes([
    { key: { timestamp: -1 } },
    { key: { eventType: 1, timestamp: -1 } },
    { key: { userId: 1, timestamp: -1 } },
    { key: { sessionId: 1, timestamp: -1 } },
    { key: { resourceId: 1, timestamp: -1 } },
    { key: { searchQuery: 1, timestamp: -1 } },
    // TTL index - auto-delete events older than 1 year
    { key: { timestamp: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 },
  ]);

  console.log('[UsageTracking] Indexes ensured');
}

export const usageTrackingService = {
  // Core tracking
  trackEvent,
  trackPageView,
  trackResourceView,
  trackResourceClick,
  trackSearch,
  trackChatMessage,
  trackAdminAction,
  trackApiRequest,
  trackUserLogin,
  trackAdminLogin,

  // Analytics
  getAnalytics,
  getQuickStats,
  getRecentActivity,

  // Setup
  ensureIndexes,
};
