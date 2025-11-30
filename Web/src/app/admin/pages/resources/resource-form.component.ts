import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminResource, Topic, ResourceTypeEntity, CONTENT_STATUS_OPTIONS } from '../../models/admin-types';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-4xl space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-4">
        <a routerLink="/admin/resources"
          class="p-2 text-cost-medium hover:text-cost-dark hover:bg-cost-light/30 rounded-xl transition-colors">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-cost-dark">{{ isEditMode() ? 'Edit Resource' : 'Create Resource' }}</h1>
          <p class="text-cost-medium mt-1">{{ isEditMode() ? 'Update resource details' : 'Add a new knowledge resource' }}</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="bg-white rounded-2xl p-12 shadow-sm border border-cost-light/30 text-center">
          <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Basic Info -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 space-y-6">
            <h2 class="text-lg font-semibold text-cost-dark">Basic Information</h2>

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Title *</label>
              <input type="text" [(ngModel)]="resource.title" name="title" required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none"
                placeholder="Resource title" />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Description *</label>
              <textarea [(ngModel)]="resource.description" name="description" required rows="3"
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none resize-none"
                placeholder="Brief description of the resource"></textarea>
            </div>

            <!-- URL -->
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">URL *</label>
              <input type="url" [(ngModel)]="resource.url" name="url" required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none"
                placeholder="https://example.com/resource" />
            </div>

            <!-- Resource Type -->
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Resource Type *</label>
              <select [(ngModel)]="resource.resourceType" name="resourceType" required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none">
                <option value="">Select type</option>
                @for (type of resourceTypes(); track type._id) {
                  <option [value]="type.slug">{{ type.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Topics -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 space-y-4">
            <h2 class="text-lg font-semibold text-cost-dark">Topics</h2>
            <p class="text-sm text-cost-medium">Select relevant topics for this resource</p>
            <div class="flex flex-wrap gap-2">
              @for (topic of topics(); track topic._id) {
                <button type="button" (click)="toggleTopic(topic._id)"
                  [class]="isTopicSelected(topic._id) ? 'bg-cost-blue text-white' : 'bg-cost-light/30 text-cost-dark hover:bg-cost-light/50'"
                  class="px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  {{ topic.name }}
                </button>
              }
            </div>
          </div>

          <!-- Status & Publishing -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 space-y-6">
            <h2 class="text-lg font-semibold text-cost-dark">Status</h2>

            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Content Status</label>
              <select [(ngModel)]="resource.status" name="status"
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none">
                @for (option of statusOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-4">
            <a routerLink="/admin/resources"
              class="px-6 py-3 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
              Cancel
            </a>
            <button type="submit" [disabled]="isSaving()"
              class="px-6 py-3 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              @if (isSaving()) {
                <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              }
              {{ isEditMode() ? 'Update Resource' : 'Create Resource' }}
            </button>
          </div>
        </form>
      }

      <!-- Error Message -->
      @if (error()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <svg class="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ error() }}</span>
          <button (click)="error.set('')" class="ml-auto">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ResourceFormComponent implements OnInit {
  isEditMode = signal(false);
  isLoading = signal(true);
  isSaving = signal(false);
  error = signal('');
  topics = signal<Topic[]>([]);
  resourceTypes = signal<ResourceTypeEntity[]>([]);
  statusOptions = CONTENT_STATUS_OPTIONS;

  resource: Partial<AdminResource> & { resourceType?: string; topics?: string[] } = {
    title: '',
    description: '',
    url: '',
    resourceType: undefined,
    status: 'pending_review',
    topics: []
  };

  private resourceId: string | null = null;

  constructor(
    private adminApi: AdminApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.resourceId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(!!this.resourceId && this.resourceId !== 'new');
    this.loadFormData();
  }

  loadFormData(): void {
    // Load topics and types in parallel
    this.adminApi.listTopics().subscribe({
      next: (topics) => this.topics.set(topics)
    });

    this.adminApi.listResourceTypes().subscribe({
      next: (types) => this.resourceTypes.set(types)
    });

    if (this.isEditMode() && this.resourceId) {
      this.adminApi.getResource(this.resourceId).subscribe({
        next: (resource) => {
          this.resource = { ...resource };
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Failed to load resource');
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  toggleTopic(topicId: string): void {
    const topics = this.resource.topics || [];
    const index = topics.indexOf(topicId);
    if (index > -1) {
      topics.splice(index, 1);
    } else {
      topics.push(topicId);
    }
    this.resource.topics = [...topics];
  }

  isTopicSelected(topicId: string): boolean {
    return (this.resource.topics || []).includes(topicId);
  }

  onSubmit(): void {
    if (!this.resource.title || !this.resource.description || !this.resource.url || !this.resource.resourceType) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');

    const operation = this.isEditMode() && this.resourceId
      ? this.adminApi.updateResource(this.resourceId, this.resource)
      : this.adminApi.createResource(this.resource);

    operation.subscribe({
      next: () => {
        this.router.navigate(['/admin/resources']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to save resource');
        this.isSaving.set(false);
      }
    });
  }
}
