import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AdminApiService } from '../../services/admin-api.service';
import { ResourceTypeEntity } from '../../models/admin-types';

@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-cost-dark">Resource Types</h1>
          <p class="text-cost-medium mt-1">Manage resource types with AI-generated icons</p>
        </div>
        <button (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Type
        </button>
      </div>

      <!-- Types Grid -->
      @if (isLoading()) {
        <div class="bg-white rounded-2xl p-12 shadow-sm border border-cost-light/30 text-center">
          <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      } @else if (types().length === 0) {
        <div class="bg-white rounded-2xl p-12 shadow-sm border border-cost-light/30 text-center">
          <svg class="w-12 h-12 mx-auto text-cost-light mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <p class="text-cost-medium">No resource types yet</p>
          <button (click)="openModal()" class="text-cost-blue hover:underline mt-2">Create your first type</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (type of types(); track type._id) {
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-cost-light/30 group">
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div class="w-16 h-16 bg-cost-blue/10 rounded-xl flex items-center justify-center flex-shrink-0 relative group-hover:bg-cost-blue/20 transition-colors">
                  @if (type.iconSvg) {
                    <div class="w-8 h-8 text-cost-blue" [innerHTML]="sanitizeIcon(type.iconSvg)"></div>
                  } @else {
                    <svg class="w-8 h-8 text-cost-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  }
                  <!-- Regenerate button on hover -->
                  <button (click)="regenerateIcon(type)" [disabled]="regeneratingId() === type._id"
                    class="absolute inset-0 flex items-center justify-center bg-cost-blue/80 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    @if (regeneratingId() === type._id) {
                      <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold text-cost-dark">{{ type.name }}</h3>
                      <p class="text-sm text-cost-medium mt-1 line-clamp-2">{{ type.description }}</p>
                    </div>
                    <div class="flex items-center gap-1 ml-2">
                      <button (click)="openModal(type)"
                        class="p-1.5 text-cost-medium hover:text-cost-blue hover:bg-cost-blue/10 rounded-lg transition-colors">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button (click)="confirmDelete(type)"
                        class="p-1.5 text-cost-medium hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="mt-3 text-xs text-cost-medium">
                    Slug: <code class="bg-cost-light/30 px-1.5 py-0.5 rounded">{{ type.slug }}</code>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Create/Edit Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-cost-dark mb-4">
            {{ editingType() ? 'Edit Resource Type' : 'Create Resource Type' }}
          </h3>
          <form (ngSubmit)="saveType()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Name *</label>
              <input type="text" [(ngModel)]="formData.name" name="name" required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none"
                placeholder="Type name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-2">Description</label>
              <textarea [(ngModel)]="formData.description" name="description" rows="3"
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none resize-none"
                placeholder="Brief description"></textarea>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" (click)="closeModal()"
                class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" [disabled]="isSaving()"
                class="px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                @if (isSaving()) {
                  <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                }
                {{ editingType() ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (typeToDelete()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-cost-dark mb-2">Delete Resource Type</h3>
          <p class="text-cost-medium mb-6">Are you sure you want to delete "{{ typeToDelete()?.name }}"? This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button (click)="typeToDelete.set(null)"
              class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
              Cancel
            </button>
            <button (click)="deleteType()"
              class="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TypeListComponent implements OnInit {
  types = signal<ResourceTypeEntity[]>([]);
  isLoading = signal(true);
  showModal = signal(false);
  isSaving = signal(false);
  editingType = signal<ResourceTypeEntity | null>(null);
  typeToDelete = signal<ResourceTypeEntity | null>(null);
  regeneratingId = signal<string | null>(null);

  formData: Partial<ResourceTypeEntity> = { name: '', description: '' };

  constructor(
    private adminApi: AdminApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadTypes();
  }

  loadTypes(): void {
    this.isLoading.set(true);
    this.adminApi.listResourceTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  sanitizeIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  openModal(type?: ResourceTypeEntity): void {
    if (type) {
      this.editingType.set(type);
      this.formData = { name: type.name, description: type.description };
    } else {
      this.editingType.set(null);
      this.formData = { name: '', description: '' };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingType.set(null);
    this.formData = { name: '', description: '' };
  }

  saveType(): void {
    if (!this.formData.name) return;

    this.isSaving.set(true);
    const editing = this.editingType();
    const operation = editing
      ? this.adminApi.updateResourceType(editing._id, this.formData)
      : this.adminApi.createResourceType(this.formData);

    operation.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.loadTypes();
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }

  confirmDelete(type: ResourceTypeEntity): void {
    this.typeToDelete.set(type);
  }

  deleteType(): void {
    const type = this.typeToDelete();
    if (!type) return;

    this.adminApi.deleteResourceType(type._id).subscribe({
      next: () => {
        this.typeToDelete.set(null);
        this.loadTypes();
      },
      error: () => {
        this.typeToDelete.set(null);
      }
    });
  }

  regenerateIcon(type: ResourceTypeEntity): void {
    this.regeneratingId.set(type._id);
    this.adminApi.regenerateTypeIcon(type._id).subscribe({
      next: () => {
        this.regeneratingId.set(null);
        this.loadTypes();
      },
      error: () => {
        this.regeneratingId.set(null);
      }
    });
  }
}
