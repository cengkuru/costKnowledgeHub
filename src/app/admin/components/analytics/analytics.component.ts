import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { I18nService } from '../../../core/services/i18n.service';
import { Observable, combineLatest, map, startWith, catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { 
  Firestore,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from '@angular/fire/firestore';

// Register Chart.js components
Chart.register(...registerables);

interface DashboardStats {
  totalPageViews: number;
  totalDownloads: number;
  activeUsers: number;
  totalResources: number;
  topResources: { id: string; title: string; views: number; downloads: number }[];
  searchTrends: { term: string; count: number }[];
  viewsChartData: { labels: string[]; data: number[] };
  resourceTypeDistribution: { type: string; count: number }[];
  // New fields for proper time periods
  pageViewsLast30Days: number;
  downloadsLast30Days: number;
  activeUsersThisMonth: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private analyticsService = inject(AnalyticsService);
  private firestoreService = inject(FirestoreService);
  private firestore = inject(Firestore);
  public i18nService = inject(I18nService);

  loading = true;
  error: string | null = null;
  stats: DashboardStats | null = null;

  @ViewChild('viewsChart') viewsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;

  private viewsChartInstance: Chart | null = null;
  private typeChartInstance: Chart | null = null;

  ngOnInit() {
    this.loadAnalytics();
  }

  ngAfterViewInit() {
    console.log('Analytics: ngAfterViewInit called', {
      stats: !!this.stats,
      loading: this.loading,
      viewsChartRef: !!this.viewsChartRef,
      typeChartRef: !!this.typeChartRef
    });
    // Render charts if data is already loaded
    if (this.stats && !this.loading) {
      this.renderCharts();
    }
  }

  async loadAnalytics() {
    try {
      this.loading = true;
      this.error = null;
      console.log('Analytics: Starting data load...');

      // Load all data in parallel
      const [
        topResourcesData,
        searchTrends,
        allResourcesResult,
        analyticsData
      ] = await Promise.all([
        this.analyticsService.getTopResources('views', 10),
        this.analyticsService.getSearchTrends(7),
        this.firestoreService.getResources(),
        this.loadAnalyticsData()
      ]);

      console.log('Analytics: Data loaded:', {
        topResourcesData: topResourcesData.length,
        searchTrends: searchTrends.length,
        totalResources: allResourcesResult.resources.length,
        analyticsData
      });

      // Calculate stats
      const publishedResources = allResourcesResult.resources.filter((r: any) => r.status === 'published');
      console.log('Analytics: Published resources:', publishedResources.length);
      
      const totalPageViews = publishedResources.reduce((sum: any, r: any) => sum + (r.views || 0), 0);
      const totalDownloads = publishedResources.reduce((sum: any, r: any) => sum + (r.downloads || 0), 0);
      
      console.log('Analytics: Calculated totals:', { totalPageViews, totalDownloads });

      // Get resource details for top resources
      const topResources = await Promise.all(
        topResourcesData.slice(0, 5).map(async (item: any) => {
          const resource = publishedResources.find((r: any) => r.id === item.resourceId);
          const title = resource?.title ?
            (typeof resource.title === 'string' ? resource.title : resource.title.en || 'Unknown Resource') :
            'Unknown Resource';
          return {
            id: item.resourceId,
            title,
            views: resource?.views || 0,
            downloads: resource?.downloads || 0
          };
        })
      );

      // Calculate resource type distribution - only show if we have real data
      const typeDistribution = this.calculateTypeDistribution(publishedResources);
      console.log('Analytics: Type distribution:', typeDistribution);

      // Generate views chart data from real analytics
      const viewsChartData = await this.generateRealViewsChartData();
      console.log('Analytics: Views chart data:', viewsChartData);

      // Calculate active users from actual analytics data
      const activeUsers = this.calculateActiveUsers(analyticsData);

      this.stats = {
        totalPageViews,
        totalDownloads,
        activeUsers,
        totalResources: publishedResources.length,
        topResources,
        searchTrends,
        viewsChartData,
        resourceTypeDistribution: typeDistribution,
        pageViewsLast30Days: analyticsData.pageViewsLast30Days,
        downloadsLast30Days: analyticsData.downloadsLast30Days,
        activeUsersThisMonth: analyticsData.activeUsersThisMonth
      };

      console.log('Analytics: Stats calculated, preparing to render charts...');
      
      // Render charts after view updates with improved timing
      setTimeout(() => {
        console.log('Analytics: Timeout reached, attempting to render charts');
        this.renderCharts();
      }, 150);

    } catch (error) {
      console.error('Error loading analytics:', error);
      this.error = 'Failed to load analytics data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private calculateTypeDistribution(resources: any[]): { type: string; count: number }[] {
    const typeCounts: { [key: string]: number } = {};

    resources.forEach(resource => {
      const type = resource.type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const distribution = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Return empty array if no resources - no hardcoded fallback data
    if (distribution.length === 0) {
      console.log('Analytics: No resources found, returning empty distribution');
      return [];
    }

    return distribution;
  }

  private generateViewsChartData(totalPageViews: number = 0): { labels: string[]; data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];

    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Generate data based on actual total views or mock data
      let dailyViews;
      if (totalPageViews > 0) {
        // If we have real data, distribute it across days with variation
        const avgDaily = totalPageViews / 30;
        const variation = Math.floor(Math.random() * avgDaily * 0.4) - (avgDaily * 0.2);
        dailyViews = Math.max(1, Math.floor(avgDaily + variation));
      } else {
        // Fallback mock data for demo
        const baseViews = 25;
        const variation = Math.floor(Math.random() * 20) - 10;
        dailyViews = Math.max(5, baseViews + variation);
      }
      
      data.push(dailyViews);
    }

    return { labels, data };
  }

  /**
   * Load real analytics data from Firestore
   */
  private async loadAnalyticsData(): Promise<{
    pageViewsLast30Days: number;
    downloadsLast30Days: number;
    activeUsersThisMonth: number;
    uniqueSessionsLast30Days: number;
    uniqueSessionsThisMonth: number;
  }> {
    const now = new Date();
    
    // Calculate dates
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // Get page views for last 30 days and this month
      const pageViewsLast30Days = await this.getAnalyticsCount('analytics_page_views', last30Days);
      const downloadsLast30Days = await this.getAnalyticsCount('analytics_downloads', last30Days);
      
      // Get unique sessions for active users calculation
      const uniqueSessionsLast30Days = await this.getUniqueSessionsCount(last30Days);
      const uniqueSessionsThisMonth = await this.getUniqueSessionsCount(startOfMonth);

      return {
        pageViewsLast30Days,
        downloadsLast30Days,
        activeUsersThisMonth: uniqueSessionsThisMonth,
        uniqueSessionsLast30Days,
        uniqueSessionsThisMonth
      };
    } catch (error) {
      console.error('Error loading analytics data:', error);
      return {
        pageViewsLast30Days: 0,
        downloadsLast30Days: 0,
        activeUsersThisMonth: 0,
        uniqueSessionsLast30Days: 0,
        uniqueSessionsThisMonth: 0
      };
    }
  }

  /**
   * Get count of documents in analytics collection since a date
   */
  private async getAnalyticsCount(collectionName: string, sinceDate: Date): Promise<number> {
    try {
      const q = query(
        collection(this.firestore, collectionName),
        where('timestamp', '>=', sinceDate)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Error getting ${collectionName} count:`, error);
      return 0;
    }
  }

  /**
   * Get unique session count since a date
   */
  private async getUniqueSessionsCount(sinceDate: Date): Promise<number> {
    try {
      const q = query(
        collection(this.firestore, 'analytics_page_views'),
        where('timestamp', '>=', sinceDate)
      );
      const snapshot = await getDocs(q);
      
      const uniqueSessions = new Set<string>();
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.sessionId) {
          uniqueSessions.add(data.sessionId);
        }
      });
      
      return uniqueSessions.size;
    } catch (error) {
      console.error('Error getting unique sessions count:', error);
      return 0;
    }
  }

  /**
   * Calculate active users from analytics data
   */
  private calculateActiveUsers(analyticsData: any): number {
    // Use unique sessions this month as active users
    // If no data, return 0 instead of hardcoded minimum
    return analyticsData.uniqueSessionsThisMonth || 0;
  }

  /**
   * Generate chart data from real analytics page views
   */
  private async generateRealViewsChartData(): Promise<{ labels: string[]; data: number[] }> {
    const labels: string[] = [];
    const data: number[] = [];

    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    try {
      // Get page views from analytics collection
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(this.firestore, 'analytics_page_views'),
        where('timestamp', '>=', thirtyDaysAgo),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      
      // Group views by day
      const viewsByDay: { [dateStr: string]: number } = {};
      
      // Initialize all days with 0
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        viewsByDay[dateStr] = 0;
      }

      // Count actual views
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.toDate) {
          const date = data.timestamp.toDate();
          const dateStr = date.toISOString().split('T')[0];
          if (viewsByDay[dateStr] !== undefined) {
            viewsByDay[dateStr]++;
          }
        }
      });

      // Convert to array
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        data.push(viewsByDay[dateStr] || 0);
      }

      console.log('Analytics: Real views chart data generated:', { labels: labels.length, data: data.length, totalViews: data.reduce((a, b) => a + b, 0) });

    } catch (error) {
      console.error('Error generating real views chart data:', error);
      // If error, return zeros instead of mock data
      for (let i = 0; i < 30; i++) {
        data.push(0);
      }
    }

    return { labels, data };
  }

  private renderCharts() {
    if (!this.stats) {
      console.log('Analytics: No stats available for rendering charts');
      return;
    }

    console.log('Analytics: Rendering charts with data:', {
      viewsData: this.stats.viewsChartData,
      typeDistribution: this.stats.resourceTypeDistribution,
      hasViewsData: this.stats.viewsChartData.data.length > 0,
      hasTypeData: this.stats.resourceTypeDistribution.length > 0
    });

    // Ensure we have the canvas elements
    if (!this.viewsChartRef || !this.typeChartRef) {
      console.log('Analytics: Chart elements not ready, retrying in 100ms');
      setTimeout(() => this.renderCharts(), 100);
      return;
    }

    // Render views chart
    const viewsCanvas = this.viewsChartRef?.nativeElement;
    if (viewsCanvas) {
      console.log('Analytics: Views chart canvas found, creating chart...');
      
      try {
        if (this.viewsChartInstance) {
          this.viewsChartInstance.destroy();
        }

        // Ensure we have data to render
        if (!this.stats.viewsChartData.data || this.stats.viewsChartData.data.length === 0) {
          console.log('Analytics: No views data available, skipping views chart');
          return;
        }

        this.viewsChartInstance = new Chart(viewsCanvas, {
          type: 'line',
          data: {
            labels: this.stats.viewsChartData.labels,
            datasets: [{
              label: 'Page Views',
              data: this.stats.viewsChartData.data,
              borderColor: '#0AAEA0',
              backgroundColor: 'rgba(10, 174, 160, 0.1)',
              tension: 0.3,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              }
            }
          }
        });
        console.log('Analytics: Views chart created successfully');
      } catch (error) {
        console.error('Analytics: Error creating views chart:', error);
      }
    } else {
      console.log('Analytics: Views chart canvas NOT found');
    }

    // Render type distribution chart
    const typeCanvas = this.typeChartRef?.nativeElement;
    if (typeCanvas) {
      console.log('Analytics: Type chart canvas found, creating chart...');
      
      try {
        if (this.typeChartInstance) {
          this.typeChartInstance.destroy();
        }

        // Ensure we have data to render
        if (!this.stats.resourceTypeDistribution || this.stats.resourceTypeDistribution.length === 0) {
          console.log('Analytics: No type distribution data available, skipping type chart');
          return;
        }

        const typeLabels = this.stats.resourceTypeDistribution.map(item =>
          this.formatTypeLabel(item.type)
        );
        const typeData = this.stats.resourceTypeDistribution.map(item => item.count);

        console.log('Analytics: Type chart data:', { typeLabels, typeData });

        this.typeChartInstance = new Chart(typeCanvas, {
          type: 'doughnut',
          data: {
            labels: typeLabels,
            datasets: [{
              data: typeData,
              backgroundColor: [
                '#355E69',
                '#0AAEA0',
                '#F0AD4E',
                '#1F1F1F',
                '#8B9DC3',
                '#B8C5D1'
              ],
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  padding: 20,
                  usePointStyle: true
                }
              }
            }
          }
        });
        console.log('Analytics: Type chart created successfully');
      } catch (error) {
        console.error('Analytics: Error creating type chart:', error);
      }
    } else {
      console.log('Analytics: Type chart canvas NOT found');
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'guide': 'Implementation Guides',
      'case-study': 'Case Studies',
      'report': 'Research Reports',
      'dataset': 'Datasets',
      'tool': 'Tools & Templates',
      'policy': 'Policy Briefs',
      'template': 'Templates',
      'infographic': 'Infographics',
      'other': 'Other Resources'
    };
    return labels[type] || type;
  }

  t(key: string): string {
    return this.i18nService.t(key) as string;
  }

  ngOnDestroy() {
    if (this.viewsChartInstance) {
      this.viewsChartInstance.destroy();
    }
    if (this.typeChartInstance) {
      this.typeChartInstance.destroy();
    }
  }
}
