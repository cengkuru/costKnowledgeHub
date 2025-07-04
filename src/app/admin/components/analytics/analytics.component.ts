import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { I18nService } from '../../../core/services/i18n.service';
import { Observable, combineLatest, map, startWith, catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';

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

      // Load all data in parallel
      const [
        topResourcesData,
        searchTrends,
        allResourcesResult
      ] = await Promise.all([
        this.analyticsService.getTopResources('views', 10),
        this.analyticsService.getSearchTrends(7),
        this.firestoreService.getResources()
      ]);

      // Calculate stats
      const publishedResources = allResourcesResult.resources.filter((r: any) => r.status === 'published');
      const totalPageViews = publishedResources.reduce((sum: any, r: any) => sum + (r.views || 0), 0);
      const totalDownloads = publishedResources.reduce((sum: any, r: any) => sum + (r.downloads || 0), 0);

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

      // Calculate resource type distribution
      const typeDistribution = this.calculateTypeDistribution(publishedResources);

      // Generate mock data for views chart (would be real data in production)
      const viewsChartData = this.generateViewsChartData();

      // Calculate active users (mock for now)
      const activeUsers = Math.floor(totalPageViews * 0.3);

      this.stats = {
        totalPageViews,
        totalDownloads,
        activeUsers,
        totalResources: publishedResources.length,
        topResources,
        searchTrends,
        viewsChartData,
        resourceTypeDistribution: typeDistribution
      };

      // Render charts after view updates
      setTimeout(() => {
        this.renderCharts();
      }, 100);

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

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateViewsChartData(): { labels: string[]; data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];

    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Generate mock view data with some variation
      const baseViews = 50;
      const variation = Math.floor(Math.random() * 30) - 15;
      data.push(Math.max(10, baseViews + variation));
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
      typeDistribution: this.stats.resourceTypeDistribution
    });

    // Render views chart
    const viewsCanvas = this.viewsChartRef?.nativeElement;
    if (viewsCanvas) {
      console.log('Analytics: Views chart canvas found');
      if (this.viewsChartInstance) {
        this.viewsChartInstance.destroy();
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
            fill: true
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
    } else {
      console.log('Analytics: Views chart canvas NOT found');
    }

    // Render type distribution chart
    const typeCanvas = this.typeChartRef?.nativeElement;
    if (typeCanvas) {
      console.log('Analytics: Type chart canvas found');
      if (this.typeChartInstance) {
        this.typeChartInstance.destroy();
      }

      const typeLabels = this.stats.resourceTypeDistribution.map(item =>
        this.t(`resourceTypes.${item.type}`)
      );
      const typeData = this.stats.resourceTypeDistribution.map(item => item.count);

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
              '#F5F6F7',
              '#8B9DC3'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
      console.log('Analytics: Type chart created successfully');
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
