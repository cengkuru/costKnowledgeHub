import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from '@angular/fire/firestore';
import { Analytics, logEvent } from '@angular/fire/analytics';

export interface PageView {
  resourceId: string;
  resourceTitle: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  duration?: number; // Time spent on page in seconds
  referrer?: string;
  userAgent?: string;
  country?: string;
}

export interface Download {
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  userId?: string;
  timestamp: Date;
  fileSize?: string;
  fileName?: string;
}

export interface AnalyticsEvent {
  eventType: 'page_view' | 'download' | 'search' | 'filter' | 'share';
  resourceId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private firestore = inject(Firestore);
  private analytics = inject(Analytics);
  private sessionId: string;

  constructor() {
    // Generate unique session ID
    this.sessionId = this.generateSessionId();
  }

  /**
   * Track a page view
   */
  async trackPageView(
    resourceId: string,
    resourceTitle: string,
    userId?: string
  ): Promise<void> {
    // Log to Firebase Analytics
    logEvent(this.analytics, 'page_view', {
      resource_id: resourceId,
      resource_title: resourceTitle,
      user_id: userId
    });

    // Store in Firestore for detailed tracking
    const pageView: Omit<PageView, 'timestamp'> = {
      resourceId,
      resourceTitle,
      userId,
      sessionId: this.sessionId,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };

    await addDoc(collection(this.firestore, 'analytics_page_views'), {
      ...pageView,
      timestamp: serverTimestamp()
    });

    // Update resource view count
    const resourceRef = doc(this.firestore, 'resources', resourceId);
    await updateDoc(resourceRef, {
      views: increment(1),
      'analytics.pageViews': increment(1),
      'analytics.lastViewedAt': serverTimestamp()
    });
  }

  /**
   * Track a download
   */
  async trackDownload(
    resourceId: string,
    resourceTitle: string,
    resourceType: string,
    fileName?: string,
    fileSize?: string,
    userId?: string
  ): Promise<void> {
    // Log to Firebase Analytics
    logEvent(this.analytics, 'file_download', {
      resource_id: resourceId,
      resource_title: resourceTitle,
      resource_type: resourceType,
      file_name: fileName,
      user_id: userId
    });

    // Store in Firestore
    const download: Omit<Download, 'timestamp'> = {
      resourceId,
      resourceTitle,
      resourceType,
      userId,
      fileName,
      fileSize
    };

    await addDoc(collection(this.firestore, 'analytics_downloads'), {
      ...download,
      timestamp: serverTimestamp()
    });

    // Update resource download count
    const resourceRef = doc(this.firestore, 'resources', resourceId);
    await updateDoc(resourceRef, {
      downloads: increment(1),
      'analytics.downloads': increment(1)
    });
  }

  /**
   * Track a search query
   */
  async trackSearch(
    searchQuery: string,
    resultsCount: number,
    userId?: string
  ): Promise<void> {
    logEvent(this.analytics, 'search', {
      search_term: searchQuery,
      results_count: resultsCount,
      user_id: userId
    });

    await addDoc(collection(this.firestore, 'analytics_searches'), {
      searchQuery,
      resultsCount,
      userId,
      sessionId: this.sessionId,
      timestamp: serverTimestamp()
    });
  }

  /**
   * Track filter usage
   */
  async trackFilter(
    filterType: string,
    filterValue: string | string[],
    userId?: string
  ): Promise<void> {
    logEvent(this.analytics, 'filter_applied', {
      filter_type: filterType,
      filter_value: Array.isArray(filterValue) ? filterValue.join(',') : filterValue,
      user_id: userId
    });

    await addDoc(collection(this.firestore, 'analytics_filters'), {
      filterType,
      filterValue,
      userId,
      sessionId: this.sessionId,
      timestamp: serverTimestamp()
    });
  }

  /**
   * Track social share
   */
  async trackShare(
    resourceId: string,
    resourceTitle: string,
    platform: string,
    userId?: string
  ): Promise<void> {
    logEvent(this.analytics, 'share', {
      resource_id: resourceId,
      resource_title: resourceTitle,
      platform: platform,
      user_id: userId
    });

    await addDoc(collection(this.firestore, 'analytics_shares'), {
      resourceId,
      resourceTitle,
      platform,
      userId,
      timestamp: serverTimestamp()
    });
  }

  /**
   * Get page view statistics for a resource
   */
  async getResourceAnalytics(resourceId: string, days: number = 30): Promise<{
    totalViews: number;
    uniqueViews: number;
    downloads: number;
    avgTimeOnPage: number;
    viewsByDay: { date: Date; views: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

        // Get page views
    const viewsQuery = query(
      collection(this.firestore, 'analytics_page_views'),
      where('resourceId', '==', resourceId),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const viewsSnapshot = await getDocs(viewsQuery);
    const views: PageView[] = [];
    const uniqueSessions = new Set<string>();

    viewsSnapshot.forEach((doc: any) => {
      const data = doc.data() as PageView;
      views.push(data);
      uniqueSessions.add(data.sessionId);
    });

    // Get downloads
    const downloadsQuery = query(
      collection(this.firestore, 'analytics_downloads'),
      where('resourceId', '==', resourceId),
      where('timestamp', '>=', startDate)
    );

    const downloadsSnapshot = await getDocs(downloadsQuery);
    const downloadCount = downloadsSnapshot.size;

    // Calculate views by day
    const viewsByDay = this.aggregateViewsByDay(views, days);

    return {
      totalViews: views.length,
      uniqueViews: uniqueSessions.size,
      downloads: downloadCount,
      avgTimeOnPage: 0, // Would need to implement time tracking
      viewsByDay
    };
  }

  /**
   * Get top resources by views or downloads
   */
    async getTopResources(
    metric: 'views' | 'downloads' = 'views',
    limitCount: number = 10
  ): Promise<{ resourceId: string; count: number }[]> {
    // In a production environment, you would maintain aggregated stats
    // For now, we'll query the resources collection
    const resourcesQuery = query(
      collection(this.firestore, 'resources'),
      where('status', '==', 'published'),
      orderBy(metric, 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(resourcesQuery);
    const topResources: { resourceId: string; count: number }[] = [];

    snapshot.forEach((doc: any) => {
      topResources.push({
        resourceId: doc.id,
        count: doc.data()[metric] || 0
      });
    });

    return topResources;
  }

  /**
   * Get search trends
   */
  async getSearchTrends(days: number = 7): Promise<{ term: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

        const searchQuery = query(
      collection(this.firestore, 'analytics_searches'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    const snapshot = await getDocs(searchQuery);
    const searchCounts: { [term: string]: number } = {};

    snapshot.forEach((doc: any) => {
      const term = doc.data().searchQuery.toLowerCase();
      searchCounts[term] = (searchCounts[term] || 0) + 1;
    });

    // Sort by count and return top terms
    return Object.entries(searchCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Aggregate views by day
   */
  private aggregateViewsByDay(views: PageView[], days: number): { date: Date; views: number }[] {
    const viewsByDay: { [key: string]: number } = {};
    const today = new Date();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      viewsByDay[key] = 0;
    }

    // Count views per day
    views.forEach(view => {
      const date = view.timestamp;
      const key = date.toISOString().split('T')[0];
      if (viewsByDay[key] !== undefined) {
        viewsByDay[key]++;
      }
    });

    // Convert to array
    return Object.entries(viewsByDay)
      .map(([dateStr, count]) => ({
        date: new Date(dateStr),
        views: count
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
