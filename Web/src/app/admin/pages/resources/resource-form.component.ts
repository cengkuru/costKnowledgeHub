import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminResource, Topic, CONTENT_STATUS_OPTIONS } from '../../models/admin-types';

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
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-cost-dark">Description *</label>
                <div class="flex items-center gap-3">
                  <!-- Description Source Badge -->
                  @if (resource.descriptionSource) {
                    <span [class]="getDescriptionSourceClass(resource.descriptionSource)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium">
                      @if (resource.descriptionSource === 'ai') {
                        <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                        </svg>
                        AI Generated
                      } @else if (resource.descriptionSource === 'discovery') {
                        <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Discovered
                      } @else {
                        <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Manual
                      }
                    </span>
                  }
                  <!-- Lock Toggle -->
                  <button type="button" (click)="toggleDescriptionLock()"
                    [disabled]="!isEditMode()"
                    [class]="resource.descriptionLocked ? 'text-amber-600 bg-amber-50' : 'text-cost-medium hover:bg-cost-light/30'"
                    class="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    [title]="resource.descriptionLocked ? 'Description is locked (AI cannot overwrite)' : 'Click to lock description'">
                    @if (resource.descriptionLocked) {
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
              <textarea [(ngModel)]="resource.description" name="description" required rows="3"
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none resize-none"
                placeholder="Brief description of the resource"></textarea>

              <!-- AI Description Generation (only in edit mode) -->
              @if (isEditMode() && resourceId()) {
                <div class="mt-3 flex items-center gap-3">
                  <button type="button" (click)="generateDescription()"
                    [disabled]="isGeneratingDescription() || resource.descriptionLocked || !resource.url"
                    class="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    @if (isGeneratingDescription()) {
                      <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    } @else {
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                      </svg>
                      AI Generate Description
                    }
                  </button>
                  @if (resource.descriptionLocked) {
                    <span class="text-xs text-amber-600">Unlock to enable AI generation</span>
                  } @else if (!resource.url) {
                    <span class="text-xs text-cost-medium">Add URL to enable AI generation</span>
                  }
                </div>
              }
            </div>

            <!-- URL -->
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">URL *</label>
              <input type="url" [(ngModel)]="resource.url" name="url" required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none"
                placeholder="https://example.com/resource" />
            </div>
          </div>

          <!-- Tags -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-cost-dark">Tags</h2>
                <p class="text-sm text-cost-medium">Add tags to help categorize and find this resource</p>
              </div>
              <button type="button" (click)="suggestTags()"
                [disabled]="isSuggestingTags() || !canSuggestTags()"
                class="px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (isSuggestingTags()) {
                  <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Suggesting...
                } @else {
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  AI Suggest Tags
                }
              </button>
            </div>

            <!-- Tag Input -->
            <div class="flex gap-2">
              <input type="text" [(ngModel)]="newTagInput" name="newTag"
                (keydown.enter)="addTag($event)"
                class="flex-1 px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none"
                placeholder="Type a tag and press Enter" />
              <button type="button" (click)="addTagFromInput()"
                [disabled]="!newTagInput.trim()"
                class="px-4 py-3 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors disabled:opacity-50">
                Add
              </button>
            </div>

            <!-- Current Tags -->
            @if (resource.tags && resource.tags.length > 0) {
              <div class="flex flex-wrap gap-2">
                @for (tag of resource.tags; track tag) {
                  <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-cost-blue/10 text-cost-blue rounded-full text-sm">
                    {{ tag }}
                    <button type="button" (click)="removeTag(tag)" class="hover:text-cost-dark transition-colors">
                      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </span>
                }
              </div>
            } @else {
              <p class="text-sm text-cost-medium italic">No tags added yet. Add tags manually or use AI suggestions.</p>
            }

            <!-- AI Suggested Tags (shown after suggestion) -->
            @if (suggestedTags().length > 0) {
              <div class="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
                <p class="text-sm font-medium text-teal-800">AI Suggestions:</p>
                <div class="flex flex-wrap gap-2">
                  @for (tag of suggestedTags(); track tag) {
                    <button type="button" (click)="addSuggestedTag(tag)"
                      class="px-3 py-1.5 bg-white text-teal-700 border border-teal-300 rounded-full text-sm hover:bg-teal-100 transition-colors flex items-center gap-1">
                      <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      {{ tag }}
                    </button>
                  }
                </div>
                <button type="button" (click)="clearSuggestions()"
                  class="text-xs text-teal-600 hover:text-teal-800 transition-colors">
                  Dismiss suggestions
                </button>
              </div>
            }
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

          <!-- Cover Image (only show on edit mode) -->
          @if (isEditMode() && resourceId()) {
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 space-y-4">
              <h2 class="text-lg font-semibold text-cost-dark">Cover Image</h2>

              <!-- Tab Switcher -->
              <div class="flex gap-2 border-b border-cost-light/30">
                <button type="button" (click)="switchCoverTab('upload')"
                  [class]="coverImageTab() === 'upload' ? 'border-b-2 border-cost-blue text-cost-blue' : 'text-cost-medium'"
                  class="px-4 py-2 font-medium transition-colors">
                  Upload Image
                </button>
                <button type="button" (click)="switchCoverTab('generate')"
                  [class]="coverImageTab() === 'generate' ? 'border-b-2 border-cost-blue text-cost-blue' : 'text-cost-medium'"
                  class="px-4 py-2 font-medium transition-colors">
                  AI Generate
                </button>
              </div>

              <!-- Upload Tab -->
              @if (coverImageTab() === 'upload') {
                <div class="space-y-3 pt-4">
                  <input type="file" accept="image/png,image/jpeg,image/webp"
                    (change)="onFileSelected($event)" #fileInput class="hidden" />

                  <button type="button" (click)="fileInput.click()"
                    class="px-4 py-2 border border-cost-light/50 rounded-xl hover:bg-cost-light/30 transition-colors">
                    Choose File
                  </button>

                  @if (selectedFile()) {
                    <div class="text-sm text-cost-medium">
                      {{ selectedFile()!.name }} ({{ (selectedFile()!.size / 1024).toFixed(1) }}KB)
                    </div>
                    <button type="button" (click)="confirmAndUpload()"
                      [disabled]="isUploadingCover()"
                      class="px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                      @if (isUploadingCover()) {
                        <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      } @else {
                        Upload
                      }
                    </button>
                  }
                </div>
              }

              <!-- Generate Tab -->
              @if (coverImageTab() === 'generate') {
                <div class="space-y-4 pt-4">
                  @if (!canGenerateCover()) {
                    <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div class="flex items-start gap-3">
                        <svg class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div>
                          <p class="text-sm font-medium text-amber-800">Requirements not met</p>
                          <p class="text-sm text-amber-700 mt-1">Fill in the title and description fields to enable AI cover image generation.</p>
                        </div>
                      </div>
                    </div>
                  }

                  @if (isGeneratingCover()) {
                    <!-- Generation in progress -->
                    <div class="p-6 bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
                      <div class="flex flex-col items-center text-center">
                        <!-- Animated icon -->
                        <div class="relative w-16 h-16 mb-4">
                          <svg class="w-16 h-16 animate-spin text-teal-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-50" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                          </svg>
                          <svg class="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                        <p class="text-lg font-semibold text-teal-800">Generating Cover Image</p>
                        <p class="text-sm text-teal-600 mt-2">This typically takes 15-25 seconds</p>
                      </div>
                    </div>
                  } @else {
                    <button type="button" (click)="confirmAndGenerate()"
                      [disabled]="!canGenerateCover()"
                      class="px-5 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                      Generate AI Cover Image
                    </button>
                  }
                </div>
              }

              <!-- Current Image Preview -->
              @if (resource.coverImage || previewUrl()) {
                <div class="relative mt-4 inline-block">
                  <img [src]="previewUrl() || resource.coverImage" alt="Cover image preview"
                    class="max-w-md rounded-lg border border-cost-light/30 shadow-sm" />
                  <button type="button" (click)="removeCoverImage()"
                    class="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Delete cover image">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"></path>
                    </svg>
                  </button>
                </div>
              }
            </div>

            <!-- Replace Confirmation Modal -->
            @if (showReplaceConfirm()) {
              <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
                  <h3 class="text-lg font-semibold text-cost-dark mb-2">Replace Cover Image?</h3>
                  <p class="text-cost-medium mb-6">
                    This will replace the existing cover image. This action cannot be undone.
                  </p>
                  <div class="flex justify-end gap-3">
                    <button type="button" (click)="cancelReplace()"
                      class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="button" (click)="confirmReplace()"
                      class="px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            }
          }

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
  statusOptions = CONTENT_STATUS_OPTIONS;

  // Tags state
  newTagInput = '';
  isSuggestingTags = signal(false);
  suggestedTags = signal<string[]>([]);

  // Description AI state
  isGeneratingDescription = signal(false);

  // Cover image state
  coverImageTab = signal<'upload' | 'generate'>('upload');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isGeneratingCover = signal(false);
  isUploadingCover = signal(false);
  showReplaceConfirm = signal(false);
  pendingAction = signal<'upload' | 'generate' | null>(null);

  // Resource ID as signal for template access
  resourceId = signal<string | null>(null);

  resource: Partial<AdminResource> & {
    tags?: string[];
    topics?: string[];
    coverImage?: string;
    descriptionLocked?: boolean;
    descriptionSource?: 'manual' | 'ai' | 'discovery';
  } = {
    title: '',
    description: '',
    descriptionLocked: false,
    descriptionSource: undefined,
    url: '',
    tags: [],
    status: 'pending_review',
    topics: [],
    coverImage: undefined
  };

  constructor(
    private adminApi: AdminApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.resourceId.set(id);
    this.isEditMode.set(!!id && id !== 'new');
    this.loadFormData();
  }

  loadFormData(): void {
    // Load topics
    this.adminApi.listTopics().subscribe({
      next: (topics) => this.topics.set(topics)
    });

    const id = this.resourceId();
    if (this.isEditMode() && id) {
      this.adminApi.getResource(id).subscribe({
        next: (resource) => {
          this.resource = {
            ...resource,
            tags: resource.tags || [],
            descriptionLocked: resource.descriptionLocked || false,
            descriptionSource: resource.descriptionSource || 'manual'
          };
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
    if (!this.resource.title || !this.resource.description || !this.resource.url) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.isSaving.set(true);
    this.error.set('');

    const id = this.resourceId();
    const operation = this.isEditMode() && id
      ? this.adminApi.updateResource(id, this.resource)
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

  // ============ Tag Methods ============

  canSuggestTags(): boolean {
    return !!(this.resource.title || this.resource.description);
  }

  suggestTags(): void {
    if (!this.canSuggestTags()) return;

    this.isSuggestingTags.set(true);
    this.error.set('');

    this.adminApi.suggestTags(this.resource.title || '', this.resource.description || '').subscribe({
      next: (response) => {
        // Filter out tags that are already added
        const existingTags = new Set(this.resource.tags || []);
        const newSuggestions = response.tags.filter((tag: string) => !existingTags.has(tag));
        this.suggestedTags.set(newSuggestions);
        this.isSuggestingTags.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to suggest tags');
        this.isSuggestingTags.set(false);
      }
    });
  }

  addTag(event: Event): void {
    event.preventDefault();
    this.addTagFromInput();
  }

  addTagFromInput(): void {
    const tag = this.newTagInput.trim().toLowerCase();
    if (!tag) return;

    if (!this.resource.tags) {
      this.resource.tags = [];
    }

    if (!this.resource.tags.includes(tag)) {
      this.resource.tags = [...this.resource.tags, tag];
    }

    this.newTagInput = '';
  }

  addSuggestedTag(tag: string): void {
    if (!this.resource.tags) {
      this.resource.tags = [];
    }

    if (!this.resource.tags.includes(tag)) {
      this.resource.tags = [...this.resource.tags, tag];
    }

    // Remove from suggestions
    this.suggestedTags.set(this.suggestedTags().filter(t => t !== tag));
  }

  removeTag(tag: string): void {
    if (this.resource.tags) {
      this.resource.tags = this.resource.tags.filter(t => t !== tag);
    }
  }

  clearSuggestions(): void {
    this.suggestedTags.set([]);
  }

  // ============ Description Methods ============

  getDescriptionSourceClass(source: string | undefined): string {
    switch (source) {
      case 'ai':
        return 'bg-teal-100 text-teal-700';
      case 'discovery':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  generateDescription(): void {
    const id = this.resourceId();
    if (!id || this.resource.descriptionLocked || !this.resource.url) return;

    this.isGeneratingDescription.set(true);
    this.error.set('');

    this.adminApi.generateDescription(id).subscribe({
      next: (response) => {
        this.resource.description = response.description;
        this.resource.descriptionSource = 'ai';
        this.isGeneratingDescription.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to generate description');
        this.isGeneratingDescription.set(false);
      }
    });
  }

  toggleDescriptionLock(): void {
    const id = this.resourceId();
    if (!id) return;

    const newLockedState = !this.resource.descriptionLocked;

    this.adminApi.toggleDescriptionLock(id, newLockedState).subscribe({
      next: () => {
        this.resource.descriptionLocked = newLockedState;
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to toggle description lock');
      }
    });
  }

  // ============ Cover Image Methods ============

  switchCoverTab(tab: 'upload' | 'generate'): void {
    this.coverImageTab.set(tab);
    // Clear file selection when switching tabs
    if (tab === 'generate') {
      this.selectedFile.set(null);
      this.previewUrl.set(null);
    }
  }

  canGenerateCover(): boolean {
    return !!(this.resource.title && this.resource.description);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('Maximum file size is 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.error.set('Only PNG, JPEG, and WebP images are allowed');
        return;
      }

      this.selectedFile.set(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  confirmAndUpload(): void {
    if (this.resource.coverImage) {
      this.pendingAction.set('upload');
      this.showReplaceConfirm.set(true);
    } else {
      this.uploadCoverImage();
    }
  }

  confirmAndGenerate(): void {
    if (this.resource.coverImage) {
      this.pendingAction.set('generate');
      this.showReplaceConfirm.set(true);
    } else {
      this.generateCoverImage();
    }
  }

  confirmReplace(): void {
    this.showReplaceConfirm.set(false);
    if (this.pendingAction() === 'upload') {
      this.uploadCoverImage();
    } else if (this.pendingAction() === 'generate') {
      this.generateCoverImage();
    }
    this.pendingAction.set(null);
  }

  cancelReplace(): void {
    this.showReplaceConfirm.set(false);
    this.pendingAction.set(null);
  }

  uploadCoverImage(): void {
    const file = this.selectedFile();
    const id = this.resourceId();
    if (!file || !id) return;

    this.isUploadingCover.set(true);
    this.error.set('');

    this.adminApi.uploadResourceCover(id, file).subscribe({
      next: (updatedResource) => {
        this.resource.coverImage = updatedResource.coverImage;
        this.selectedFile.set(null);
        this.previewUrl.set(null);
        this.isUploadingCover.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to upload cover image');
        this.isUploadingCover.set(false);
      }
    });
  }

  generateCoverImage(): void {
    const id = this.resourceId();
    if (!id) return;

    this.isGeneratingCover.set(true);
    this.error.set('');

    this.adminApi.regenerateResourceCover(id).subscribe({
      next: (updatedResource) => {
        this.resource.coverImage = updatedResource.coverImage;
        this.isGeneratingCover.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to generate cover image');
        this.isGeneratingCover.set(false);
      }
    });
  }

  removeCoverImage(): void {
    const id = this.resourceId();
    if (!id || !this.resource.coverImage) return;

    this.adminApi.deleteResourceCover(id).subscribe({
      next: (updatedResource) => {
        this.resource.coverImage = updatedResource.coverImage;
        this.previewUrl.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to delete cover image');
      }
    });
  }
}
