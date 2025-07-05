import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18nService } from '../../../../../core/services/i18n.service';
import { TagSettings } from '../../models/settings.model';

@Component({
  selector: 'app-tag-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form [formGroup]="tagForm" (ngSubmit)="save()">
              <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4">
                      {{ tag ? i18nService.t('admin.settingsPage.contentManagement.tags.edit') : i18nService.t('admin.settingsPage.contentManagement.tags.add') }}
                    </h3>
                    
                    <div class="space-y-4">
                      <!-- Tag Name -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.name') }}
                        </label>
                        <input 
                          type="text" 
                          formControlName="name"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                          [placeholder]="i18nService.t('admin.settingsPage.contentManagement.tags.namePlaceholder')"
                        >
                        <div *ngIf="tagForm.get('name')?.errors?.['required'] && tagForm.get('name')?.touched" 
                             class="mt-1 text-sm text-red-600">
                          {{ i18nService.t('admin.settingsPage.validation.required') }}
                        </div>
                      </div>

                      <!-- Tag Color -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.color') }}
                        </label>
                        <div class="flex items-center space-x-2">
                          <input 
                            type="color" 
                            formControlName="color"
                            class="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                          >
                          <input 
                            type="text" 
                            formControlName="color"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                            placeholder="#0EA5E9"
                          >
                        </div>
                      </div>

                      <!-- Tag Icon -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.icon') }} 
                          <span class="text-gray-500 text-xs">({{ i18nService.t('common.optional') }})</span>
                        </label>
                        <input 
                          type="text" 
                          formControlName="icon"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                          placeholder="label"
                        >
                        <p class="mt-1 text-xs text-gray-500">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.iconHelp') }}
                        </p>
                      </div>

                      <!-- Category -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.category') }}
                        </label>
                        <select 
                          formControlName="category"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan"
                        >
                          <option value="">{{ i18nService.t('admin.settingsPage.contentManagement.tags.noCategory') }}</option>
                          <option *ngFor="let category of categories" [value]="category.id">
                            {{ category.name }}
                          </option>
                        </select>
                      </div>

                      <!-- Preview -->
                      <div class="border-t pt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.preview') }}
                        </label>
                        <div class="flex items-center space-x-2">
                          <span 
                            class="inline-flex items-center px-3 py-1 rounded-full text-sm"
                            [style.background-color]="tagForm.get('color')?.value + '20'"
                            [style.color]="tagForm.get('color')?.value"
                          >
                            <svg *ngIf="!tagForm.get('icon')?.value" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                            <span *ngIf="tagForm.get('icon')?.value" class="mr-1 text-sm">{{ tagForm.get('icon')?.value }}</span>
                            {{ tagForm.get('name')?.value || 'Tag Name' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button 
                  type="submit"
                  [disabled]="!tagForm.valid || saving"
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
export class TagModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() tag?: TagSettings;
  @Input() categories: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saveTag = new EventEmitter<TagSettings>();

  tagForm: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    public i18nService: I18nService
  ) {
    this.tagForm = this.fb.group({
      name: ['', Validators.required],
      color: ['#0EA5E9', Validators.required],
      icon: ['label'],
      category: ['']
    });
  }

  ngOnInit() {
    if (this.tag) {
      this.tagForm.patchValue({
        name: this.tag.name,
        color: this.tag.color,
        icon: this.tag.icon || 'label',
        category: this.tag.category || ''
      });
    }
  }

  save() {
    if (this.tagForm.valid && !this.saving) {
      this.saving = true;
      const tagData: TagSettings = {
        id: this.tag?.id || this.generateId(),
        ...this.tagForm.value,
        enabled: true
      };
      this.saveTag.emit(tagData);
      
      // Reset saving state after a delay (parent should handle actual state)
      setTimeout(() => {
        this.saving = false;
      }, 2000);
    }
  }

  cancel() {
    this.close.emit();
  }

  private generateId(): string {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}