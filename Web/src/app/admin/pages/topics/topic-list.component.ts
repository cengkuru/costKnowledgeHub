import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { Topic } from '../../models/admin-types';

@Component({
  selector: 'app-topic-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-cost-dark">Topics</h1>
          <p class="text-cost-medium mt-1">Manage resource topics with AI-generated images</p>
        </div>
        <button (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Topic
        </button>
      </div>

      <!-- Topics Grid -->
      @if (isLoading()) {
        <div class="bg-white rounded-2xl p-12 shadow-sm border border-cost-light/30 text-center">
          <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      } @else if (topics().length === 0) {
        <div class="bg-white rounded-2xl p-12 shadow-sm border border-cost-light/30 text-center">
          <svg class="w-12 h-12 mx-auto text-cost-light mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <p class="text-cost-medium">No topics yet</p>
          <button (click)="openModal()" class="text-cost-blue hover:underline mt-2">Create your first topic</button>
        </div>
      } @else {
        <!-- Published Topics Section -->
        @if (publishedTopics().length > 0) {
          <div class="mb-8">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <h2 class="text-lg font-semibold text-cost-dark">Published</h2>
              <span class="text-sm text-cost-medium">({{ publishedTopics().length }})</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (topic of publishedTopics(); track topic._id) {
                <ng-container *ngTemplateOutlet="topicCard; context: { $implicit: topic }"></ng-container>
              }
            </div>
          </div>
        }

        <!-- Unpublished Topics Section -->
        @if (unpublishedTopics().length > 0) {
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-2 h-2 rounded-full bg-gray-400"></div>
              <h2 class="text-lg font-semibold text-cost-medium">Unpublished</h2>
              <span class="text-sm text-cost-medium">({{ unpublishedTopics().length }})</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (topic of unpublishedTopics(); track topic._id) {
                <ng-container *ngTemplateOutlet="topicCard; context: { $implicit: topic }"></ng-container>
              }
            </div>
          </div>
        }
      }

      <!-- Topic Card Template -->
      <ng-template #topicCard let-topic>
        <div class="rounded-2xl shadow-sm border overflow-hidden group transition-all duration-200"
             [class.bg-white]="topic.isActive"
             [class.border-cost-light/30]="topic.isActive"
             [class.bg-gray-50]="!topic.isActive"
             [class.border-gray-200]="!topic.isActive"
             [class.border-dashed]="!topic.isActive"
             [class.opacity-70]="!topic.isActive"
             [class.ring-2]="justUpdated() === topic._id"
             [class.ring-green-400]="justUpdated() === topic._id">
          <!-- Image Container -->
          <div class="relative h-40 bg-gradient-to-br from-cost-blue/20 to-cost-red/20 overflow-hidden"
               [class.grayscale]="!topic.isActive"
               [class.opacity-60]="!topic.isActive">
            <!-- Actual Image -->
            @if (topic.aiGeneratedImage) {
              <img [src]="topic.aiGeneratedImage"
                   [alt]="topic.name"
                   class="w-full h-full object-cover transition-opacity duration-500"
                   [class.opacity-50]="regeneratingId() === topic._id"
                   (error)="handleImageError($event, topic)" />
            } @else {
              <!-- Placeholder gradient with name -->
              <div class="w-full h-full flex items-center justify-center"
                   [style.background]="getGradientForTopic(topic.name)">
                <span class="text-white text-lg font-semibold px-4 text-center">{{ topic.name }}</span>
              </div>
            }

            <!-- Unpublished Banner -->
            @if (!topic.isActive) {
              <div class="absolute top-2 left-2 z-10">
                <span class="px-2 py-1 text-xs font-bold bg-gray-800/80 text-white rounded uppercase tracking-wide">
                  Unpublished
                </span>
              </div>
            }

            <!-- Loading Overlay - Always visible when regenerating -->
            @if (regeneratingId() === topic._id) {
              <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                <svg class="w-10 h-10 animate-spin text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-white text-sm font-medium">Generating AI Image...</span>
                <span class="text-white/70 text-xs mt-1">This may take 10-20 seconds</span>
              </div>
            }

            <!-- Success Overlay -->
            @if (justUpdated() === topic._id) {
              <div class="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10 animate-pulse">
                <div class="bg-white rounded-full p-2">
                  <svg class="w-8 h-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            }

            <!-- Hover Overlay for Regenerate Button (only when not loading) -->
            @if (regeneratingId() !== topic._id && justUpdated() !== topic._id) {
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button (click)="regenerateImage(topic)"
                  class="px-4 py-2 bg-white/95 text-cost-dark rounded-lg text-sm font-medium hover:bg-white transition-all transform scale-95 group-hover:scale-100 flex items-center gap-2 shadow-lg">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Regenerate Image
                </button>
              </div>
            }
          </div>

          <!-- Content -->
          <div class="p-4">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-cost-dark">{{ topic.name }}</h3>
                  @if (topic.isActive) {
                    <span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Published</span>
                  } @else {
                    <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Draft</span>
                  }
                </div>
                <p class="text-sm text-cost-medium mt-1 line-clamp-2">{{ topic.description }}</p>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <!-- Publish Toggle -->
                <button (click)="toggleActive(topic)"
                  [disabled]="togglingId() === topic._id"
                  [class]="topic.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'"
                  class="p-1.5 hover:text-cost-blue rounded-lg transition-colors disabled:opacity-50"
                  [title]="topic.isActive ? 'Unpublish topic' : 'Publish topic'">
                  @if (togglingId() === topic._id) {
                    <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  } @else if (topic.isActive) {
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  }
                </button>
                @if (!topic.isDefault) {
                  <button (click)="editTopic(topic)"
                    class="p-1.5 text-cost-medium hover:text-cost-blue hover:bg-cost-blue/10 rounded-lg transition-colors">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                }
                @if (!topic.isDefault) {
                  <button (click)="confirmDelete(topic)"
                    class="p-1.5 text-cost-medium hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                } @else {
                  <span class="p-1.5 text-cost-light cursor-not-allowed" title="Default topic cannot be deleted">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                }
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-cost-medium">
              <div>
                Slug: <code class="bg-cost-light/30 px-1.5 py-0.5 rounded">{{ topic.slug }}</code>
              </div>
              <button (click)="viewTopicResources(topic)"
                class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-cost-blue/10 hover:text-cost-blue transition-colors group/resources">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span class="font-medium">{{ topic.resourceCount || 0 }}</span>
                <span class="text-cost-light group-hover/resources:text-cost-blue">resources</span>
                <svg class="w-3 h-3 opacity-0 -translate-x-1 group-hover/resources:opacity-100 group-hover/resources:translate-x-0 transition-all" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Create/Edit Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-200"
           [class.animate-fade-in]="!modalClosing()"
           [class.opacity-0]="modalClosing()">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 transition-all duration-200"
             [class.animate-modal-in]="!modalClosing() && !saveSuccess()"
             [class.scale-95]="modalClosing()"
             [class.opacity-0]="modalClosing()">

          <!-- Success State -->
          @if (saveSuccess()) {
            <div class="py-8 text-center animate-success-bounce">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-green-600 animate-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-cost-dark">
                {{ editingTopic() ? 'Topic Updated!' : 'Topic Created!' }}
              </h3>
              <p class="text-cost-medium mt-1 text-sm">{{ formData.name }}</p>
            </div>
          } @else {
            <!-- Form State -->
            <h3 class="text-lg font-semibold text-cost-dark mb-4">
              {{ editingTopic() ? 'Edit Topic' : 'Create Topic' }}
            </h3>
            <form (ngSubmit)="saveTopic()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-cost-dark mb-2">Name *</label>
                <input type="text" [(ngModel)]="formData.name" name="name" required
                  [disabled]="isSaving()"
                  class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Topic name" />
              </div>
              <div>
                <label class="block text-sm font-medium text-cost-dark mb-2">Description</label>
                <textarea [(ngModel)]="formData.description" name="description" rows="3"
                  [disabled]="isSaving()"
                  class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none resize-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Brief description"></textarea>
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button type="button" (click)="closeModal()" [disabled]="isSaving()"
                  class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancel
                </button>
                <button type="submit" [disabled]="isSaving() || !formData.name"
                  class="px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center">
                  @if (isSaving()) {
                    <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  } @else {
                    {{ editingTopic() ? 'Update' : 'Create' }}
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (topicToDelete()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-200"
           [class.animate-fade-in]="!deleteModalClosing()"
           [class.opacity-0]="deleteModalClosing()">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 transition-all duration-200"
             [class.animate-modal-in]="!deleteModalClosing() && !deleteSuccess()"
             [class.scale-95]="deleteModalClosing()"
             [class.opacity-0]="deleteModalClosing()">

          <!-- Delete Success State -->
          @if (deleteSuccess()) {
            <div class="py-8 text-center animate-success-bounce">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-600 animate-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-cost-dark">Topic Deleted</h3>
              @if (lastDeleteResult()?.reassignedCount && lastDeleteResult()!.reassignedCount > 0) {
                <p class="text-cost-medium mt-1 text-sm">
                  {{ lastDeleteResult()!.reassignedCount }} resource{{ lastDeleteResult()!.reassignedCount === 1 ? '' : 's' }} moved to Uncategorized
                </p>
              }
            </div>
          } @else {
            <!-- Confirmation State -->
            <div class="flex items-start gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-cost-dark">Delete Topic</h3>
                <p class="text-cost-medium mt-1">
                  Are you sure you want to delete "<strong>{{ topicToDelete()?.name }}</strong>"?
                </p>
              </div>
            </div>

            @if (topicToDelete()?.resourceCount && topicToDelete()!.resourceCount! > 0) {
              <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p class="text-sm text-amber-800">
                    <strong>{{ topicToDelete()!.resourceCount }}</strong> resource{{ topicToDelete()!.resourceCount === 1 ? '' : 's' }} will be moved to the <strong>Uncategorized</strong> topic.
                  </p>
                </div>
              </div>
            }

            <p class="text-sm text-cost-medium mb-6">This action cannot be undone.</p>

            <div class="flex justify-end gap-3">
              <button (click)="cancelDelete()" [disabled]="isDeleting()"
                class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button (click)="deleteTopic()" [disabled]="isDeleting()"
                class="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center">
                @if (isDeleting()) {
                  <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Deleting...</span>
                } @else {
                  Delete
                }
              </button>
            </div>
          }
        </div>
      </div>
    }

    <!-- Toast Notifications -->
    @if (successMessage()) {
      <div class="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div class="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-xl shadow-lg">
          <svg class="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span class="text-sm font-medium">{{ successMessage() }}</span>
          <button (click)="successMessage.set(null)" class="ml-2 p-1 hover:bg-white/20 rounded">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    }

    @if (errorMessage()) {
      <div class="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div class="flex items-center gap-3 px-4 py-3 bg-red-600 text-white rounded-xl shadow-lg max-w-md">
          <svg class="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span class="text-sm font-medium">{{ errorMessage() }}</span>
          <button (click)="errorMessage.set(null)" class="ml-2 p-1 hover:bg-white/20 rounded">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes success-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-success {
      animation: success-pulse 0.5s ease-in-out 2;
    }
    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    @keyframes modal-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    .animate-modal-in {
      animation: modal-in 0.3s ease-out;
    }
    @keyframes success-bounce {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-success-bounce {
      animation: success-bounce 0.4s ease-out;
    }
    @keyframes checkmark-draw {
      0% { stroke-dashoffset: 24; }
      100% { stroke-dashoffset: 0; }
    }
    .animate-checkmark {
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
      animation: checkmark-draw 0.4s ease-out 0.2s forwards;
    }
  `]
})
export class TopicListComponent implements OnInit {
  topics = signal<Topic[]>([]);
  publishedTopics = computed(() => this.topics().filter(t => t.isActive));
  unpublishedTopics = computed(() => this.topics().filter(t => !t.isActive));
  isLoading = signal(true);
  showModal = signal(false);
  modalClosing = signal(false);
  isSaving = signal(false);
  saveSuccess = signal(false);
  editingTopic = signal<Topic | null>(null);
  topicToDelete = signal<Topic | null>(null);
  deleteModalClosing = signal(false);
  isDeleting = signal(false);
  deleteSuccess = signal(false);
  lastDeleteResult = signal<{ reassignedCount: number } | null>(null);
  regeneratingId = signal<string | null>(null);
  justUpdated = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  togglingId = signal<string | null>(null);

  formData: Partial<Topic> = { name: '', description: '' };

  constructor(
    private adminApi: AdminApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTopics();
  }

  loadTopics(): void {
    this.isLoading.set(true);
    this.adminApi.listTopics(true).subscribe({
      next: (topics) => {
        this.topics.set(topics);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openModal(topic?: Topic): void {
    if (topic) {
      this.editingTopic.set(topic);
      this.formData = { name: topic.name, description: topic.description };
    } else {
      this.editingTopic.set(null);
      this.formData = { name: '', description: '' };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.modalClosing.set(true);
    setTimeout(() => {
      this.showModal.set(false);
      this.modalClosing.set(false);
      this.saveSuccess.set(false);
      this.editingTopic.set(null);
      this.formData = { name: '', description: '' };
    }, 200);
  }

  saveTopic(): void {
    if (!this.formData.name) return;

    this.isSaving.set(true);
    const editing = this.editingTopic();
    const isEditing = !!editing;
    const topicName = this.formData.name;

    const operation = editing
      ? this.adminApi.updateTopic(editing._id, this.formData)
      : this.adminApi.createTopic(this.formData);

    operation.subscribe({
      next: (savedTopic) => {
        this.isSaving.set(false);

        // Show success state in modal
        this.saveSuccess.set(true);

        // Refresh the list in the background
        this.loadTopics();

        // After showing success, animate out and close
        setTimeout(() => {
          this.modalClosing.set(true);

          // Actually close after animation
          setTimeout(() => {
            this.showModal.set(false);
            this.modalClosing.set(false);
            this.saveSuccess.set(false);
            this.editingTopic.set(null);
            this.formData = { name: '', description: '' };

            // Show toast notification
            this.successMessage.set(isEditing ? `"${topicName}" updated successfully` : `"${topicName}" created successfully`);

            // Highlight the updated/created topic
            if (savedTopic && savedTopic._id) {
              this.justUpdated.set(savedTopic._id);
              setTimeout(() => {
                if (this.justUpdated() === savedTopic._id) {
                  this.justUpdated.set(null);
                }
              }, 3000);
            }

            setTimeout(() => {
              this.successMessage.set(null);
            }, 3000);
          }, 200);
        }, 800);
      },
      error: (err) => {
        this.isSaving.set(false);
        const message = err?.error?.error || 'Failed to save topic. Please try again.';
        this.errorMessage.set(message);

        setTimeout(() => {
          this.errorMessage.set(null);
        }, 5000);
      }
    });
  }

  confirmDelete(topic: Topic): void {
    this.deleteSuccess.set(false);
    this.deleteModalClosing.set(false);
    this.lastDeleteResult.set(null);
    this.topicToDelete.set(topic);
  }

  cancelDelete(): void {
    this.deleteModalClosing.set(true);
    setTimeout(() => {
      this.topicToDelete.set(null);
      this.deleteModalClosing.set(false);
      this.deleteSuccess.set(false);
      this.lastDeleteResult.set(null);
    }, 200);
  }

  deleteTopic(): void {
    const topic = this.topicToDelete();
    if (!topic) return;

    this.isDeleting.set(true);
    const topicName = topic.name;

    this.adminApi.deleteTopic(topic._id).subscribe({
      next: (result) => {
        this.isDeleting.set(false);
        this.lastDeleteResult.set(result);
        this.deleteSuccess.set(true);

        // Refresh the list in the background
        this.loadTopics();

        // After showing success, animate out and close
        setTimeout(() => {
          this.deleteModalClosing.set(true);

          setTimeout(() => {
            this.topicToDelete.set(null);
            this.deleteModalClosing.set(false);
            this.deleteSuccess.set(false);

            // Show toast notification
            if (result.reassignedCount > 0) {
              this.successMessage.set(`"${topicName}" deleted. ${result.reassignedCount} resource${result.reassignedCount === 1 ? '' : 's'} moved to Uncategorized.`);
            } else {
              this.successMessage.set(`"${topicName}" deleted successfully`);
            }

            setTimeout(() => {
              this.successMessage.set(null);
            }, 4000);
          }, 200);
        }, 1000);
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.deleteModalClosing.set(true);

        setTimeout(() => {
          this.topicToDelete.set(null);
          this.deleteModalClosing.set(false);

          const message = err?.error?.error || 'Failed to delete topic. Please try again.';
          this.errorMessage.set(message);

          setTimeout(() => {
            this.errorMessage.set(null);
          }, 5000);
        }, 200);
      }
    });
  }

  regenerateImage(topic: Topic): void {
    this.regeneratingId.set(topic._id);
    this.justUpdated.set(null);
    this.errorMessage.set(null);

    this.adminApi.regenerateTopicImage(topic._id).subscribe({
      next: (updatedTopic) => {
        // Update the topic in-place without refreshing the full list
        const currentTopics = this.topics();
        const index = currentTopics.findIndex(t => t._id === topic._id);
        if (index !== -1) {
          const newTopics = [...currentTopics];
          newTopics[index] = updatedTopic;
          this.topics.set(newTopics);
        }

        this.regeneratingId.set(null);
        this.justUpdated.set(topic._id);
        this.successMessage.set(`Image regenerated for "${topic.name}"`);

        // Clear success state after 3 seconds
        setTimeout(() => {
          if (this.justUpdated() === topic._id) {
            this.justUpdated.set(null);
          }
          this.successMessage.set(null);
        }, 3000);
      },
      error: (err) => {
        this.regeneratingId.set(null);
        const message = err?.error?.error || 'Image generation failed. Please try again.';
        this.errorMessage.set(message);
        console.error('Image regeneration failed:', err);

        // Clear error after 5 seconds
        setTimeout(() => {
          this.errorMessage.set(null);
        }, 5000);
      }
    });
  }

  handleImageError(event: Event, topic: Topic): void {
    // If image fails to load, hide it and show placeholder
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    console.warn(`Failed to load image for topic: ${topic.name}`);
  }

  getGradientForTopic(name: string): string {
    // Generate consistent gradient based on topic name
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))`;
  }

  toggleActive(topic: Topic): void {
    this.togglingId.set(topic._id);
    this.errorMessage.set(null);

    const newStatus = !topic.isActive;
    this.adminApi.updateTopic(topic._id, { isActive: newStatus }).subscribe({
      next: (updatedTopic) => {
        // Update the topic in-place
        const currentTopics = this.topics();
        const index = currentTopics.findIndex(t => t._id === topic._id);
        if (index !== -1) {
          const newTopics = [...currentTopics];
          newTopics[index] = updatedTopic;
          this.topics.set(newTopics);
        }

        this.togglingId.set(null);
        this.successMessage.set(`"${topic.name}" ${newStatus ? 'published' : 'unpublished'}`);

        setTimeout(() => {
          this.successMessage.set(null);
        }, 3000);
      },
      error: (err) => {
        this.togglingId.set(null);
        const message = err?.error?.error || 'Failed to update topic status';
        this.errorMessage.set(message);

        setTimeout(() => {
          this.errorMessage.set(null);
        }, 5000);
      }
    });
  }

  viewTopicResources(topic: Topic): void {
    this.router.navigate(['/admin/resources'], {
      queryParams: { topic: topic.name }
    });
  }

  editTopic(topic: Topic): void {
    this.editingTopic.set(topic);
    this.formData = { name: topic.name, description: topic.description };
    this.showModal.set(true);
  }
}
