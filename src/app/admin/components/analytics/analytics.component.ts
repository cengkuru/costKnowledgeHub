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
      console.log('Analytics: Starting data load...');

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

      console.log('Analytics: Data loaded:', {
        topResourcesData: topResourcesData.length,
        searchTrends: searchTrends.length,
        totalResources: allResourcesResult.resources.length
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

      // Calculate resource type distribution with fallback
      const typeDistribution = this.calculateTypeDistribution(publishedResources);
      console.log('Analytics: Type distribution:', typeDistribution);

      // Generate views chart data (enhanced with fallback)
      const viewsChartData = this.generateViewsChartData(totalPageViews);
      console.log('Analytics: Views chart data:', viewsChartData);

      // Calculate active users (mock for now)
      const activeUsers = Math.max(Math.floor(totalPageViews * 0.3), 15); // Minimum 15 for demo

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

    // Fallback: If no resources, create sample data for demo
    if (distribution.length === 0) {
      console.log('Analytics: No resources found, generating fallback type distribution');
      return [
        { type: 'guide', count: 5 },
        { type: 'report', count: 3 },
        { type: 'tool', count: 2 },
        { type: 'case-study', count: 1 }
      ];
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
