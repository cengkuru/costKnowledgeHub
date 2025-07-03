import { Component, OnInit, inject } from '@angular/core';
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
  template: `
    <div class="analytics-dashboard">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">{{ i18nService.t('admin.analytics.title') }}</h1>
        <p class="text-gray-600 mt-2">{{ i18nService.t('admin.analytics.subtitle') }}</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="inline-flex items-center">
            <svg class="animate-spin h-8 w-8 text-cost-teal mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-lg text-gray-700">{{ i18nService.t('admin.analytics.loading') }}</span>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-red-800">{{ error }}</p>
        </div>
      </div>

      <!-- Stats Overview -->
      <div *ngIf="!loading && stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Page Views -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{{ i18nService.t('admin.analytics.totalPageViews') }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ formatNumber(stats.totalPageViews) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ i18nService.t('admin.analytics.last30Days') }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-lg">
              <svg class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Downloads -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{{ i18nService.t('admin.analytics.totalDownloads') }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ formatNumber(stats.totalDownloads) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ i18nService.t('admin.analytics.last30Days') }}</p>
            </div>
            <div class="p-3 bg-green-100 rounded-lg">
              <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Active Users -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{{ i18nService.t('admin.analytics.activeUsers') }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ formatNumber(stats.activeUsers) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ i18nService.t('admin.analytics.thisMonth') }}</p>
            </div>
            <div class="p-3 bg-purple-100 rounded-lg">
              <svg class="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Resources -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{{ i18nService.t('admin.analytics.totalResources') }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ formatNumber(stats.totalResources) }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ i18nService.t('admin.analytics.published') }}</p>
            </div>
            <div class="p-3 bg-amber-100 rounded-lg">
              <svg class="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div *ngIf="!loading && stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Page Views Chart -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ i18nService.t('admin.analytics.pageViewsOverTime') }}</h2>
          <canvas #viewsChart height="300"></canvas>
        </div>

        <!-- Resource Type Distribution -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ i18nService.t('admin.analytics.resourceTypeDistribution') }}</h2>
          <canvas #typeChart height="300"></canvas>
        </div>
      </div>

      <!-- Tables Section -->
      <div *ngIf="!loading && stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Resources -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ i18nService.t('admin.analytics.topResources') }}</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {{ i18nService.t('admin.analytics.resource') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {{ i18nService.t('admin.analytics.views') }}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {{ i18nService.t('admin.analytics.downloads') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let resource of stats.topResources; let i = index" 
                    class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-sm">
                    <div class="flex items-center">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-medium mr-3">
                        {{ i + 1 }}
                      </span>
                      <span class="text-gray-900 font-medium">{{ resource.title }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ formatNumber(resource.views) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ formatNumber(resource.downloads) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Search Trends -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ i18nService.t('admin.analytics.searchTrends') }}</h2>
          <div class="space-y-3">
            <div *ngFor="let trend of stats.searchTrends; let i = index" 
                 class="flex items-center justify-between">
              <div class="flex items-center">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium mr-3">
                  {{ i + 1 }}
                </span>
                <span class="text-gray-900">{{ trend.term }}</span>
              </div>
              <span class="text-sm text-gray-500">{{ trend.count }} {{ i18nService.t('admin.analytics.searches') }}</span>
            </div>
            <div *ngIf="stats.searchTrends.length === 0" class="text-center py-8 text-gray-500">
              {{ i18nService.t('admin.analytics.noSearchData') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      padding: 2rem;
    }

    canvas {
      max-height: 300px;
    }

    @media (max-width: 768px) {
      .analytics-dashboard {
        padding: 1rem;
      }
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private firestoreService = inject(FirestoreService);
  public i18nService = inject(I18nService);

  loading = true;
  error: string | null = null;
  stats: DashboardStats | null = null;

  private viewsChartInstance: Chart | null = null;
  private typeChartInstance: Chart | null = null;

  ngOnInit() {
    this.loadAnalytics();
  }

  async loadAnalytics() {
    try {
      this.loading = true;
      this.error = null;

      // Load all data in parallel
      const [
        topResourcesData,
        searchTrends,
        allResources
      ] = await Promise.all([
        this.analyticsService.getTopResources('views', 10),
        this.analyticsService.getSearchTrends(7),
        this.firestoreService.getResources()
      ]);

      // Calculate stats
      const publishedResources = allResources.filter(r => r.status === 'published');
      const totalPageViews = publishedResources.reduce((sum, r) => sum + (r.views || 0), 0);
      const totalDownloads = publishedResources.reduce((sum, r) => sum + (r.downloads || 0), 0);

      // Get resource details for top resources
      const topResources = await Promise.all(
        topResourcesData.slice(0, 5).map(async (item) => {
          const resource = publishedResources.find(r => r.id === item.resourceId);
          return {
            id: item.resourceId,
            title: resource?.title || 'Unknown Resource',
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
    if (!this.stats) return;

    // Render views chart
    const viewsCanvas = document.querySelector('#viewsChart') as HTMLCanvasElement;
    if (viewsCanvas) {
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
    }

    // Render type distribution chart
    const typeCanvas = document.querySelector('#typeChart') as HTMLCanvasElement;
    if (typeCanvas) {
      if (this.typeChartInstance) {
        this.typeChartInstance.destroy();
      }

      const typeLabels = this.stats.resourceTypeDistribution.map(item => 
        this.i18nService.t(`resourceTypes.${item.type}`)
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

  ngOnDestroy() {
    if (this.viewsChartInstance) {
      this.viewsChartInstance.destroy();
    }
    if (this.typeChartInstance) {
      this.typeChartInstance.destroy();
    }
  }
}