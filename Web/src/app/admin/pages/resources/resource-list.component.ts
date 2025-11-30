import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminResource, CONTENT_STATUS_OPTIONS } from '../../models/admin-types';

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-cost-dark">Resources</h1>
          <p class="text-cost-medium mt-1">Manage knowledge hub resources</p>
        </div>
        <a routerLink="/admin/resources/new"
          class="inline-flex items-center gap-2 px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Resource
        </a>
      </div>

      <!-- Active Topic Filter Banner -->
      @if (topicFilter) {
        <div class="bg-cost-blue/10 border border-cost-blue/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2 text-cost-blue">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span class="font-medium">Filtered by topic:</span>
            <span class="bg-cost-blue text-white px-2 py-0.5 rounded-lg text-sm">{{ topicFilter }}</span>
          </div>
          <button (click)="clearTopicFilter()"
            class="flex items-center gap-1 text-sm text-cost-blue hover:text-cost-dark transition-colors">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear filter
          </button>
        </div>
      }

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-cost-light/30">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <input type="text" [(ngModel)]="searchQuery" (input)="onSearch()"
              placeholder="Search resources..."
              class="w-full px-4 py-2 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none" />
          </div>
          <select [(ngModel)]="statusFilter" (change)="loadResources()"
            class="px-4 py-2 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none">
            <option value="">All Statuses</option>
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Resources Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-cost-light/30 overflow-hidden">
        @if (isLoading()) {
          <div class="text-center py-12">
            <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        } @else if (resources().length === 0) {
          <div class="text-center py-12">
            <svg class="w-12 h-12 mx-auto text-cost-light mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p class="text-cost-medium">No resources found</p>
            <a routerLink="/admin/resources/new" class="text-cost-blue hover:underline mt-2 inline-block">Create your first resource</a>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-cost-medium bg-cost-offwhite border-b border-cost-light/30">
                  <th class="px-6 py-4 font-medium">Title</th>
                  <th class="px-6 py-4 font-medium">Type</th>
                  <th class="px-6 py-4 font-medium">Status</th>
                  <th class="px-6 py-4 font-medium">Updated</th>
                  <th class="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (resource of resources(); track resource._id) {
                  <tr class="border-b border-cost-light/20 hover:bg-cost-offwhite/50 transition-colors">
                    <td class="px-6 py-4">
                      <div>
                        <p class="font-medium text-cost-dark">{{ resource.title }}</p>
                        <p class="text-sm text-cost-medium truncate max-w-md">{{ resource.description }}</p>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-cost-medium capitalize">{{ formatType(resource.resourceType) }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span [class]="getStatusClass(resource.status)"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {{ formatStatus(resource.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-cost-medium">{{ formatDate(resource.updatedAt) }}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <a [routerLink]="['/admin/resources', resource._id]"
                          class="p-2 text-cost-medium hover:text-cost-blue hover:bg-cost-blue/10 rounded-lg transition-colors">
                          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </a>
                        <button (click)="confirmDelete(resource)"
                          class="p-2 text-cost-medium hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-6 py-4 border-t border-cost-light/30">
              <p class="text-sm text-cost-medium">
                Showing {{ (currentPage() - 1) * 20 + 1 }} to {{ Math.min(currentPage() * 20, total()) }} of {{ total() }} results
              </p>
              <div class="flex items-center gap-2">
                <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                  class="px-3 py-1.5 text-sm border border-cost-light/50 rounded-lg hover:bg-cost-offwhite disabled:opacity-50 disabled:cursor-not-allowed">
                  Previous
                </button>
                <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                  class="px-3 py-1.5 text-sm border border-cost-light/50 rounded-lg hover:bg-cost-offwhite disabled:opacity-50 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    @if (resourceToDelete()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-cost-dark mb-2">Delete Resource</h3>
          <p class="text-cost-medium mb-6">Are you sure you want to delete "{{ resourceToDelete()?.title }}"? This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button (click)="resourceToDelete.set(null)"
              class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
              Cancel
            </button>
            <button (click)="deleteResource()"
              class="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ResourceListComponent implements OnInit {
  resources = signal<AdminResource[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  total = signal(0);
  totalPages = signal(1);
  searchQuery = '';
  statusFilter = '';
  topicFilter = '';
  resourceToDelete = signal<AdminResource | null>(null);
  statusOptions = CONTENT_STATUS_OPTIONS;
  Math = Math;

  private searchTimeout: any;

  constructor(
    private adminApi: AdminApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check for topic filter from query params
    this.route.queryParams.subscribe(params => {
      if (params['topic']) {
        this.topicFilter = params['topic'];
      }
      this.loadResources();
    });
  }

  loadResources(): void {
    this.isLoading.set(true);
    const filters: Record<string, string> = {};
    if (this.searchQuery) filters['q'] = this.searchQuery;
    if (this.statusFilter) filters['status'] = this.statusFilter;
    if (this.topicFilter) filters['topic'] = this.topicFilter;

    this.adminApi.listResources(this.currentPage(), 20, filters).subscribe({
      next: (response) => {
        this.resources.set(response.data);
        this.total.set(response.total);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadResources();
    }, 300);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadResources();
    }
  }

  clearTopicFilter(): void {
    this.topicFilter = '';
    this.router.navigate(['/admin/resources'], { queryParams: {} });
  }

  confirmDelete(resource: AdminResource): void {
    this.resourceToDelete.set(resource);
  }

  deleteResource(): void {
    const resource = this.resourceToDelete();
    if (!resource) return;

    this.adminApi.deleteResource(resource._id).subscribe({
      next: () => {
        this.resourceToDelete.set(null);
        this.loadResources();
      },
      error: () => {
        this.resourceToDelete.set(null);
      }
    });
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

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
