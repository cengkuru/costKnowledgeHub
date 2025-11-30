import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminResource, CONTENT_STATUS_OPTIONS } from '../../models/admin-types';

interface BrokenResource {
  _id: string;
  title: string;
  url: string;
  error: string;
}

interface CleanupResult {
  message: string;
  processed: number;
  failed: number;
  errors: string[];
}

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Counter -->
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-cost-dark">Resources</h1>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-cost-blue/10 text-cost-blue">
              {{ total() }} total
            </span>
          </div>
          <p class="text-cost-medium mt-1">Manage knowledge hub resources</p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="openCleanupModal()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Scan URLs
          </button>
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
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex-1 min-w-[200px] relative">
            <input type="text" [(ngModel)]="searchQuery" (input)="onSearch()"
              [placeholder]="getSearchPlaceholder()"
              class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none transition-colors"
              [class.border-purple-300]="semanticSearch"
              [class.border-cost-light/50]="!semanticSearch"
              [class.bg-purple-50/30]="semanticSearch" />
            @if (isSearching()) {
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg class="w-5 h-5 animate-spin text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            }
          </div>

          <!-- Semantic Search Toggle -->
          <button (click)="toggleSemanticSearch()"
            [class]="semanticSearch ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-cost-medium border-cost-light/50 hover:border-purple-300 hover:text-purple-600'"
            class="flex items-center gap-2 px-4 py-2 border rounded-xl transition-all">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span class="text-sm font-medium">AI Search</span>
            @if (semanticSearch) {
              <span class="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">ON</span>
            }
          </button>

          <select [(ngModel)]="statusFilter" (change)="loadResources()"
            class="px-4 py-2 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none">
            <option value="">All Statuses</option>
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>

        <!-- AI Search Info Banner -->
        @if (semanticSearch) {
          <div class="mt-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p class="text-xs text-purple-700">
                <strong>AI-powered search</strong> understands meaning, not just keywords. Try searching for "review" to find "assurance reports", or "data standard" to find "OC4IDS" resources.
              </p>
            </div>
          </div>
        }
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
                  <th class="px-6 py-4 font-medium">Topic</th>
                  <th class="px-6 py-4 font-medium">Tags</th>
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
                      @if (resource.category) {
                        <button (click)="filterByTopic(resource.category)"
                          [class]="topicFilter === resource.category ? 'bg-cost-blue text-white' : 'bg-cost-blue/10 text-cost-blue hover:bg-cost-blue/20'"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                          <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                          {{ resource.category }}
                        </button>
                      } @else {
                        <span class="text-sm text-cost-light italic">Uncategorized</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      @if (resource.tags && resource.tags.length > 0) {
                        <div class="flex flex-wrap gap-1 max-w-xs">
                          @for (tag of resource.tags.slice(0, 3); track tag) {
                            <span class="inline-flex px-2 py-0.5 bg-cost-light/30 text-cost-dark rounded text-xs">{{ tag }}</span>
                          }
                          @if (resource.tags.length > 3) {
                            <span class="text-xs text-cost-medium">+{{ resource.tags.length - 3 }}</span>
                          }
                        </div>
                      } @else {
                        <span class="text-sm text-cost-light italic">No tags</span>
                      }
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
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-end gap-1">
                        <a [routerLink]="['/admin/resources', resource._id]"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cost-blue bg-cost-blue/10 hover:bg-cost-blue hover:text-white rounded-lg transition-colors"
                          title="Edit resource">
                          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </a>
                        <button (click)="confirmDelete(resource)"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                          title="Delete resource">
                          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
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

    <!-- URL Cleanup Modal -->
    @if (showCleanupModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-cost-dark">URL Validation & Cleanup</h3>
            <button (click)="closeCleanupModal()" class="text-cost-medium hover:text-cost-dark">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          @if (isValidatingUrls()) {
            <div class="flex-1 flex items-center justify-center py-12">
              <div class="text-center">
                <svg class="w-12 h-12 animate-spin mx-auto text-cost-blue mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="text-cost-medium">Validating resource URLs...</p>
                <p class="text-sm text-cost-light mt-1">This may take a few minutes</p>
              </div>
            </div>
          } @else if (brokenResources().length === 0 && !cleanupResult()) {
            <div class="flex-1 flex items-center justify-center py-12">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p class="text-cost-dark font-medium">All URLs are valid!</p>
                <p class="text-sm text-cost-medium mt-1">No broken resources found</p>
              </div>
            </div>
          } @else if (cleanupResult()) {
            <div class="flex-1 flex items-center justify-center py-12">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p class="text-cost-dark font-medium">{{ cleanupResult()?.message }}</p>
                <p class="text-sm text-cost-medium mt-1">Processed: {{ cleanupResult()?.processed }} | Failed: {{ cleanupResult()?.failed }}</p>
              </div>
            </div>
          } @else {
            <div class="flex-1 overflow-auto">
              <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p class="text-amber-800 font-medium">{{ brokenResources().length }} broken resources found</p>
                    <p class="text-sm text-amber-700">These resources have URLs that are no longer accessible.</p>
                  </div>
                </div>
              </div>

              <div class="space-y-2 max-h-64 overflow-auto">
                @for (resource of brokenResources(); track resource._id) {
                  <div class="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p class="font-medium text-cost-dark text-sm truncate">{{ resource.title }}</p>
                    <p class="text-xs text-cost-medium truncate mt-1">{{ resource.url }}</p>
                    <p class="text-xs text-red-600 mt-1">{{ resource.error }}</p>
                  </div>
                }
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-cost-light/30">
              <p class="text-sm text-cost-medium mb-3">Choose an action for broken resources:</p>
              <div class="flex gap-3">
                <button (click)="cleanupBrokenResources('archive')"
                  [disabled]="isCleaningUp()"
                  class="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                  @if (isCleaningUp()) {
                    <svg class="w-5 h-5 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  } @else {
                    Archive All
                  }
                </button>
                <button (click)="cleanupBrokenResources('delete')"
                  [disabled]="isCleaningUp()"
                  class="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                  @if (isCleaningUp()) {
                    <svg class="w-5 h-5 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  } @else {
                    Delete All
                  }
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class ResourceListComponent implements OnInit {
  resources = signal<AdminResource[]>([]);
  isLoading = signal(true);
  isSearching = signal(false);
  currentPage = signal(1);
  total = signal(0);
  totalPages = signal(1);
  searchQuery = '';
  statusFilter = '';
  topicFilter = '';
  semanticSearch = false;
  resourceToDelete = signal<AdminResource | null>(null);
  statusOptions = CONTENT_STATUS_OPTIONS;
  Math = Math;

  // URL Cleanup
  showCleanupModal = signal(false);
  isValidatingUrls = signal(false);
  isCleaningUp = signal(false);
  brokenResources = signal<BrokenResource[]>([]);
  cleanupResult = signal<CleanupResult | null>(null);

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

    // Use semantic search when enabled and there's a search query
    const useSemanticSearch = this.semanticSearch && !!this.searchQuery;

    this.adminApi.listResources(this.currentPage(), 20, filters, useSemanticSearch).subscribe({
      next: (response) => {
        this.resources.set(response.data);
        this.total.set(response.total);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
        this.isSearching.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.isSearching.set(false);
      }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    // Show searching indicator for semantic search (which takes longer)
    if (this.semanticSearch && this.searchQuery) {
      this.isSearching.set(true);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadResources();
    }, this.semanticSearch ? 500 : 300); // Slightly longer debounce for semantic search
  }

  toggleSemanticSearch(): void {
    this.semanticSearch = !this.semanticSearch;
    // Reload if there's a search query to apply/remove semantic search
    if (this.searchQuery) {
      this.currentPage.set(1);
      this.loadResources();
    }
  }

  getSearchPlaceholder(): string {
    return this.semanticSearch
      ? 'Smart search (e.g., "review" finds "assurance")...'
      : 'Search resources...';
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

  filterByTopic(topic: string): void {
    if (this.topicFilter === topic) {
      // If already filtered by this topic, clear the filter
      this.clearTopicFilter();
    } else {
      this.topicFilter = topic;
      this.currentPage.set(1);
      this.router.navigate(['/admin/resources'], { queryParams: { topic } });
    }
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // URL Cleanup Methods
  openCleanupModal(): void {
    this.showCleanupModal.set(true);
    this.brokenResources.set([]);
    this.cleanupResult.set(null);
    this.validateUrls();
  }

  closeCleanupModal(): void {
    this.showCleanupModal.set(false);
    this.brokenResources.set([]);
    this.cleanupResult.set(null);
    // Reload resources in case cleanup was performed
    this.loadResources();
  }

  validateUrls(): void {
    this.isValidatingUrls.set(true);
    this.adminApi.validateResourceUrls().subscribe({
      next: (response) => {
        this.brokenResources.set(response.broken);
        this.isValidatingUrls.set(false);
      },
      error: () => {
        this.isValidatingUrls.set(false);
      }
    });
  }

  cleanupBrokenResources(action: 'archive' | 'delete'): void {
    this.isCleaningUp.set(true);
    this.adminApi.cleanupBrokenResources(action).subscribe({
      next: (result) => {
        this.cleanupResult.set(result);
        this.brokenResources.set([]);
        this.isCleaningUp.set(false);
      },
      error: () => {
        this.isCleaningUp.set(false);
      }
    });
  }
}
