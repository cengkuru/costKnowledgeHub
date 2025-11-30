import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminResource, DashboardStats } from '../../models/admin-types';

interface DescriptionStats {
  total: number;
  withDescription: number;
  withoutDescription: number;
  locked: number;
  aiGenerated: number;
  manual: number;
  discovery: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-cost-dark">Dashboard</h1>
        <p class="text-cost-medium mt-1">Welcome back, {{ authService.userName() || authService.userEmail() }}</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Resources -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-cost-blue/10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-cost-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <p class="text-sm text-cost-medium">Total Resources</p>
              <p class="text-2xl font-bold text-cost-dark">{{ stats().total }}</p>
            </div>
          </div>
        </div>

        <!-- Published -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p class="text-sm text-cost-medium">Published</p>
              <p class="text-2xl font-bold text-green-600">{{ stats().published }}</p>
            </div>
          </div>
        </div>

        <!-- Pending Review -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p class="text-sm text-cost-medium">Pending Review</p>
              <p class="text-2xl font-bold text-amber-600">{{ stats().pending }}</p>
            </div>
          </div>
        </div>

        <!-- Archived -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-slate-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
              </svg>
            </div>
            <div>
              <p class="text-sm text-cost-medium">Archived</p>
              <p class="text-2xl font-bold text-slate-600">{{ stats().archived }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
        <h2 class="text-lg font-semibold text-cost-dark mb-4">Quick Actions</h2>
        <div class="flex flex-wrap gap-4">
          <a routerLink="/admin/resources/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Resource
          </a>
          <a routerLink="/admin/resources"
            class="inline-flex items-center gap-2 px-4 py-2 bg-cost-light/30 text-cost-dark rounded-xl hover:bg-cost-light/50 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Manage Resources
          </a>
          <a routerLink="/admin/topics"
            class="inline-flex items-center gap-2 px-4 py-2 bg-cost-light/30 text-cost-dark rounded-xl hover:bg-cost-light/50 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Manage Topics
          </a>
          <a routerLink="/admin/types"
            class="inline-flex items-center gap-2 px-4 py-2 bg-cost-light/30 text-cost-dark rounded-xl hover:bg-cost-light/50 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Manage Types
          </a>
        </div>
      </div>

      <!-- AI Description Stats -->
      @if (descriptionStats()) {
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-cost-dark">AI Descriptions</h2>
          <button
            (click)="fillMissingDescriptions()"
            [disabled]="isFillingDescriptions() || descriptionStats()!.withoutDescription === 0"
            class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            @if (isFillingDescriptions()) {
              <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Filling...
            } @else {
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7l3-7z" />
              </svg>
              Fill Missing ({{ descriptionStats()!.withoutDescription }})
            }
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-cost-medium">Description Coverage</span>
            <span class="font-medium text-cost-dark">{{ getDescriptionCoverage() }}%</span>
          </div>
          <div class="h-2 bg-cost-light/30 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
              [style.width.%]="getDescriptionCoverage()">
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-3 bg-green-50 rounded-xl">
            <p class="text-2xl font-bold text-green-600">{{ descriptionStats()!.withDescription }}</p>
            <p class="text-xs text-cost-medium">With Description</p>
          </div>
          <div class="text-center p-3 bg-amber-50 rounded-xl">
            <p class="text-2xl font-bold text-amber-600">{{ descriptionStats()!.withoutDescription }}</p>
            <p class="text-xs text-cost-medium">Missing</p>
          </div>
          <div class="text-center p-3 bg-purple-50 rounded-xl">
            <p class="text-2xl font-bold text-purple-600">{{ descriptionStats()!.aiGenerated }}</p>
            <p class="text-xs text-cost-medium">AI Generated</p>
          </div>
          <div class="text-center p-3 bg-blue-50 rounded-xl">
            <p class="text-2xl font-bold text-blue-600">{{ descriptionStats()!.locked }}</p>
            <p class="text-xs text-cost-medium">Locked</p>
          </div>
        </div>
      </div>
      }

      <!-- Recent Resources -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30">
        <h2 class="text-lg font-semibold text-cost-dark mb-4">Recent Resources</h2>
        @if (isLoading()) {
        <div class="text-center py-8">
          <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
        </div>
        } @else if (recentResources().length === 0) {
        <p class="text-cost-medium text-center py-8">No resources yet</p>
        } @else {
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-cost-medium border-b border-cost-light/30">
                <th class="pb-3 font-medium">Title</th>
                <th class="pb-3 font-medium">Tags</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Updated</th>
                <th class="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              @for (resource of recentResources(); track resource._id) {
              <tr class="border-b border-cost-light/20 last:border-0">
                <td class="py-3">
                  <span class="font-medium text-cost-dark">{{ resource.title }}</span>
                </td>
                <td class="py-3">
                  @if (resource.tags && resource.tags.length > 0) {
                    <div class="flex flex-wrap gap-1">
                      @for (tag of resource.tags.slice(0, 2); track tag) {
                        <span class="inline-flex px-2 py-0.5 bg-cost-light/30 text-cost-dark rounded text-xs">{{ tag }}</span>
                      }
                      @if (resource.tags.length > 2) {
                        <span class="text-xs text-cost-medium">+{{ resource.tags.length - 2 }}</span>
                      }
                    </div>
                  } @else {
                    <span class="text-xs text-cost-light italic">No tags</span>
                  }
                </td>
                <td class="py-3">
                  <span [class]="getStatusClass(resource.status)"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ (resource.status || 'unknown').replace('_', ' ') }}
                  </span>
                </td>
                <td class="py-3">
                  <span class="text-sm text-cost-medium">{{ formatDate(resource.updatedAt) }}</span>
                </td>
                <td class="py-3">
                  <a [routerLink]="['/admin/resources', resource._id]"
                    class="text-cost-blue hover:text-cost-red text-sm font-medium">
                    Edit
                  </a>
                </td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats>({ total: 0, published: 0, pending: 0, archived: 0 });
  descriptionStats = signal<DescriptionStats | null>(null);
  recentResources = signal<AdminResource[]>([]);
  isLoading = signal(true);
  isFillingDescriptions = signal(false);

  constructor(
    public authService: AuthService,
    private adminApi: AdminApiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Load stats
    this.adminApi.getDashboardStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => {
        // Fallback - calculate from resources
      }
    });

    // Load description stats
    this.adminApi.getDescriptionStats().subscribe({
      next: (stats) => this.descriptionStats.set(stats),
      error: () => {
        // Ignore errors for description stats
      }
    });

    // Load recent resources
    this.adminApi.listResources(1, 5).subscribe({
      next: (response) => {
        this.recentResources.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  fillMissingDescriptions(): void {
    if (this.isFillingDescriptions()) return;

    this.isFillingDescriptions.set(true);
    this.adminApi.runDescriptionFillJob().subscribe({
      next: (result) => {
        this.isFillingDescriptions.set(false);
        alert(`Description fill complete: ${result.processed} processed, ${result.failed} failed`);
        // Reload description stats
        this.adminApi.getDescriptionStats().subscribe({
          next: (stats) => this.descriptionStats.set(stats)
        });
      },
      error: () => {
        this.isFillingDescriptions.set(false);
        alert('Failed to run description fill job');
      }
    });
  }

  getDescriptionCoverage(): number {
    const stats = this.descriptionStats();
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.withDescription / stats.total) * 100);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      pending_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      archived: 'bg-slate-100 text-slate-700',
      rejected: 'bg-red-100 text-red-700',
      discovered: 'bg-purple-100 text-purple-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
