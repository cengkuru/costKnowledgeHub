import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18nService } from '../../../../../core/services/i18n.service';
import { CategorySettings } from '../../models/settings.model';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form [formGroup]="categoryForm" (ngSubmit)="save()">
              <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4">
                      {{ category ? i18nService.t('admin.settingsPage.contentManagement.categories.edit') : i18nService.t('admin.settingsPage.contentManagement.categories.add') }}
                    </h3>
                    
                    <div class="space-y-4">
                      <!-- Category Name -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.categories.name') }}
                        </label>
                        <input 
                          type="text" 
                          formControlName="name"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                          [placeholder]="i18nService.t('admin.settingsPage.contentManagement.categories.namePlaceholder')"
                        >
                        <div *ngIf="categoryForm.get('name')?.errors?.['required'] && categoryForm.get('name')?.touched" 
                             class="mt-1 text-sm text-red-600">
                          {{ i18nService.t('admin.settingsPage.validation.required') }}
                        </div>
                      </div>

                      <!-- Category Description -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.categories.description') }}
                          <span class="text-gray-500 text-xs">({{ i18nService.t('common.optional') }})</span>
                        </label>
                        <textarea 
                          formControlName="description"
                          rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                          [placeholder]="i18nService.t('admin.settingsPage.contentManagement.categories.descriptionPlaceholder')"
                        ></textarea>
                      </div>

                      <!-- Category Order -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.categories.order') }}
                        </label>
                        <input 
                          type="number" 
                          formControlName="order"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                          min="0"
                        >
                        <p class="mt-1 text-xs text-gray-500">
                          {{ i18nService.t('admin.settingsPage.contentManagement.categories.orderHelp') }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button 
                  type="submit"
                  [disabled]="!categoryForm.valid || saving"
                  class="inline-flex w-full justify-center rounded-md bg-cost-cyan px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cost-teal disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  <span *ngIf="!saving">{{ i18nService.t('common.save') }}</span>
                  <span *ngIf="saving" class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ i18nService.t('common.saving') }}
                  </span>
                </button>
                <button 
                  type="button" 
                  (click)="cancel()"
                  [disabled]="saving"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  {{ i18nService.t('common.cancel') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CategoryModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() category?: CategorySettings;
  @Output() close = new EventEmitter<void>();
  @Output() saveCategory = new EventEmitter<CategorySettings>();

  categoryForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    public i18nService: I18nService
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      order: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    if (this.category) {
      this.categoryForm.patchValue({
        name: this.category.name,
        description: this.category.description || '',
        order: this.category.order || 0
      });
    }
  }

  save() {
    if (this.categoryForm.valid) {
      const categoryData: CategorySettings = {
        id: this.category?.id || this.generateId(),
        ...this.categoryForm.value
      };
      this.saveCategory.emit(categoryData);
    }
  }

  cancel() {
    this.close.emit();
  }

  private generateId(): string {
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}