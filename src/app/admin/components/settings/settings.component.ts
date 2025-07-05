import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, combineLatest, firstValueFrom, Observable } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { SettingsService } from './services/settings.service';
import { I18nService } from '../../../core/services/i18n.service';
import { environment } from '../../../../environments/environment';
import { ResourceTypeModalComponent } from './components/resource-type-modal/resource-type-modal.component';
import { TagModalComponent } from './components/tag-modal/tag-modal.component';
import { CategoryModalComponent } from './components/category-modal/category-modal.component';
import { 
  SettingsTab, 
  ApplicationSettings, 
  UserSecuritySettings,
  ContentManagementSettings,
  ResourceTypeSettings,
  TagSettings,
  CategorySettings
} from './models/settings.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ResourceTypeModalComponent, TagModalComponent, CategoryModalComponent, DragDropModule],
  template: `
    <div class="min-h-screen bg-cost-gray">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="py-6">
            <h1 class="text-2xl font-semibold text-cost-charcoal">
              {{ i18nService.t('admin.settingsPage.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600">
              {{ i18nService.t('admin.settingsPage.subtitle') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="lg:grid lg:grid-cols-12 lg:gap-x-8">
          <!-- Sidebar Navigation -->
          <aside class="py-6 px-2 sm:px-6 lg:px-0 lg:col-span-3">
            <nav class="space-y-1">
              <button 
                *ngFor="let tab of tabs"
                (click)="setActiveTab(tab.id)"
                [class]="getTabClass(tab)"
                class="group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left focus:outline-none focus:ring-2 focus:ring-cost-cyan focus:ring-offset-2"
              >
                <span [class]="getTabIconClass(tab)" class="flex-shrink-0 -ml-1 mr-3 h-6 w-6"></span>
                <span class="truncate">{{ i18nService.t('admin.settingsPage.tabs.' + tab.id) }}</span>
                <span 
                  *ngIf="tab.hasChanges" 
                  class="ml-auto w-2 h-2 bg-cost-amber rounded-full"
                ></span>
              </button>
            </nav>
          </aside>

          <!-- Main Content -->
          <div class="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            <!-- Loading State -->
            <div *ngIf="settingsService.loading$ | async" class="flex justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cost-cyan"></div>
              <span class="ml-2 text-gray-600">{{ i18nService.t('admin.settingsPage.actions.loadingSettings') }}</span>
            </div>

            <!-- Settings Forms -->
            <div *ngIf="!(settingsService.loading$ | async)">
              <!-- Application Settings -->
              <div *ngIf="activeTab === 'application'" class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                    {{ i18nService.t('admin.settingsPage.application.title') }}
                  </h3>
                  
                  <form [formGroup]="applicationForm" (ngSubmit)="saveApplicationSettings()">
                    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <!-- Site Title -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.siteTitle') }}
                        </label>
                        <input 
                          type="text" 
                          formControlName="siteTitle"
                          class="input-field"
                          [placeholder]="i18nService.t('admin.settingsPage.application.siteTitle')"
                        >
                        <div *ngIf="applicationForm.get('siteTitle')?.errors?.['required'] && applicationForm.get('siteTitle')?.touched" 
                             class="mt-1 text-sm text-red-600">
                          {{ i18nService.t('admin.settingsPage.validation.required') }}
                        </div>
                      </div>

                      <!-- Site Description -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.siteDescription') }}
                        </label>
                        <textarea 
                          formControlName="siteDescription"
                          rows="3"
                          class="input-field"
                          [placeholder]="i18nService.t('admin.settingsPage.application.siteDescription')"
                        ></textarea>
                      </div>

                      <!-- Default Language -->
                      <div>
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.defaultLanguage') }}
                        </label>
                        <select formControlName="defaultLanguage" class="input-field">
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="pt">Português</option>
                        </select>
                      </div>

                      <!-- Timezone -->
                      <div>
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.timezone') }}
                        </label>
                        <select formControlName="timezone" class="input-field">
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                        </select>
                      </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="mt-6 flex justify-end space-x-3">
                      <button 
                        type="button"
                        (click)="resetForm('application')"
                        class="btn-secondary"
                      >
                        {{ i18nService.t('admin.settingsPage.actions.reset') }}
                      </button>
                      <button 
                        type="submit"
                        [disabled]="applicationForm.invalid || saving"
                        [class.opacity-50]="applicationForm.invalid || saving"
                        class="btn-primary"
                      >
                        <span *ngIf="!saving">{{ i18nService.t('admin.settingsPage.actions.save') }}</span>
                        <span *ngIf="saving" class="flex items-center">
                          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {{ i18nService.t('admin.settingsPage.actions.savingSettings') }}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <!-- User & Security Settings -->
              <div *ngIf="activeTab === 'userSecurity'" class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                    {{ i18nService.t('admin.settingsPage.userSecurity.title') }}
                  </h3>
                  
                  <form [formGroup]="userSecurityForm" (ngSubmit)="saveUserSecuritySettings()">
                    <div class="space-y-6">
                      <!-- User Registration -->
                      <div>
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="allowUserRegistration"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.allowUserRegistration') }}
                          </label>
                        </div>
                      </div>

                      <!-- Email Verification -->
                      <div>
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="requireEmailVerification"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.requireEmailVerification') }}
                          </label>
                        </div>
                      </div>

                      <!-- Password Requirements -->
                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.userSecurity.passwordMinLength') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="passwordMinLength"
                            min="6"
                            max="20"
                            class="input-field"
                          >
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.userSecurity.sessionTimeoutMinutes') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="sessionTimeoutMinutes"
                            min="15"
                            max="1440"
                            class="input-field"
                          >
                        </div>
                      </div>

                      <!-- Password Requirements Checkboxes -->
                      <div class="space-y-3">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="passwordRequireUppercase"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.passwordRequireUppercase') }}
                          </label>
                        </div>

                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="passwordRequireNumbers"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.passwordRequireNumbers') }}
                          </label>
                        </div>

                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="passwordRequireSpecialChars"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.passwordRequireSpecialChars') }}
                          </label>
                        </div>
                      </div>

                      <!-- Security Settings -->
                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.userSecurity.maxLoginAttempts') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="maxLoginAttempts"
                            min="3"
                            max="10"
                            class="input-field"
                          >
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.userSecurity.lockoutDurationMinutes') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="lockoutDurationMinutes"
                            min="1"
                            max="60"
                            class="input-field"
                          >
                        </div>
                      </div>

                      <!-- Advanced Security -->
                      <div class="space-y-3">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="twoFactorAuthEnabled"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.twoFactorAuthEnabled') }}
                          </label>
                        </div>

                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="adminApprovalRequired"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.userSecurity.adminApprovalRequired') }}
                          </label>
                        </div>
                      </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="mt-6 flex justify-end space-x-3">
                      <button 
                        type="button"
                        (click)="resetForm('userSecurity')"
                        class="btn-secondary"
                      >
                        {{ i18nService.t('admin.settingsPage.actions.reset') }}
                      </button>
                      <button 
                        type="submit"
                        [disabled]="userSecurityForm.invalid || saving"
                        [class.opacity-50]="userSecurityForm.invalid || saving"
                        class="btn-primary"
                      >
                        <span *ngIf="!saving">{{ i18nService.t('admin.settingsPage.actions.save') }}</span>
                        <span *ngIf="saving" class="flex items-center">
                          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {{ i18nService.t('admin.settingsPage.actions.savingSettings') }}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <!-- Content Management Settings -->
              <div *ngIf="activeTab === 'contentManagement'" class="space-y-6">
                <!-- Resource Types Section -->
                <div class="bg-white shadow rounded-lg">
                  <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                      {{ i18nService.t('admin.settingsPage.contentManagement.resourceTypes.title') }}
                    </h3>
                    
                    <!-- Resource Types List with Drag & Drop -->
                    <div 
                      cdkDropList 
                      [cdkDropListData]="resourceTypes" 
                      (cdkDropListDropped)="dropResourceType($event)"
                      class="space-y-3"
                    >
                      <div 
                        *ngFor="let type of resourceTypes" 
                        cdkDrag
                        class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-move"
                        [class.cdk-drag-dragging]="false"
                      >
                        <!-- Drag Handle -->
                        <div class="flex items-center space-x-3">
                          <div cdkDragHandle class="cursor-move p-1 hover:bg-gray-100 rounded">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                            </svg>
                          </div>
                          <img 
                            *ngIf="type.defaultCover"
                            [src]="type.defaultCover" 
                            alt="{{ type.label }}" 
                            class="w-12 h-12 object-cover rounded"
                          />
                          <div *ngIf="!type.defaultCover" class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <div>
                            <p class="font-medium text-cost-charcoal">{{ type.label }}</p>
                            <p class="text-sm text-gray-600">{{ type.description }}</p>
                          </div>
                        </div>
                        <div class="flex items-center space-x-2">
                          <label class="flex items-center">
                            <input 
                              type="checkbox" 
                              [checked]="type.enabled"
                              (change)="toggleResourceType(type.id, $event)"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <span class="ml-2 text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.enabled') }}
                            </span>
                          </label>
                          <button 
                            type="button"
                            (click)="editResourceType(type)"
                            class="text-cost-cyan hover:text-cost-teal"
                            [attr.aria-label]="'Edit ' + type.label"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button 
                            type="button"
                            *ngIf="type.id !== 'other'"
                            (click)="deleteResourceType(type)"
                            class="text-red-600 hover:text-red-700"
                            [attr.aria-label]="'Delete ' + type.label"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        (click)="addNewResourceType()"
                        class="btn-secondary w-full"
                      >
                        <span class="text-lg mr-2">+</span>
                        {{ i18nService.t('admin.settingsPage.contentManagement.resourceTypes.add') }}
                      </button>
                      
                      <!-- Restore All Defaults button hidden as a fail-safe -->
                      <!-- <button 
                        type="button"
                        (click)="restoreDefaultResourceTypes()"
                        class="btn-primary w-full"
                      >
                        <span class="material-icons mr-2">restore</span>
                        {{ i18nService.t('admin.settingsPage.contentManagement.resourceTypes.restoreDefaults') }}
                      </button> -->
                    </div>
                  </div>
                </div>

                <!-- Tags & Categories Section -->
                <div class="bg-white shadow rounded-lg">
                  <div class="px-4 py-5 sm:p-6">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg leading-6 font-medium text-cost-charcoal">
                        {{ i18nService.t('admin.settingsPage.contentManagement.tags.title') }}
                      </h3>
                      <button 
                        type="button"
                        (click)="generateAISuggestions()"
                        class="btn-primary flex items-center"
                        [disabled]="generatingAI"
                      >
                        <svg *ngIf="!generatingAI" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <svg *ngIf="generatingAI" class="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ generatingAI ? i18nService.t('admin.settingsPage.contentManagement.tags.generating') : i18nService.t('admin.settingsPage.contentManagement.tags.aiSuggest') }}
                      </button>
                    </div>
                    
                    <!-- Categories -->
                    <div class="mb-6">
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="text-sm font-medium text-cost-charcoal">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.categories') }}
                        </h4>
                        <div class="flex items-center space-x-2">
                          <button 
                            type="button"
                            (click)="suggestCategoriesWithAI()"
                            class="text-sm text-cost-amber hover:text-amber-600 flex items-center"
                            [disabled]="generatingAI"
                            title="{{ i18nService.t('admin.settingsPage.contentManagement.categories.aiSuggestTooltip') }}"
                          >
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                            {{ i18nService.t('admin.settingsPage.contentManagement.categories.aiSuggest') }}
                          </button>
                          <button 
                            type="button"
                            (click)="addNewCategory()"
                            class="text-sm text-cost-cyan hover:text-cost-teal flex items-center"
                          >
                            <span class="text-sm mr-1">+</span>
                            {{ i18nService.t('admin.settingsPage.contentManagement.categories.add') }}
                          </button>
                        </div>
                      </div>
                      <div class="space-y-2">
                        <div *ngFor="let category of tagCategories$ | async; trackBy: trackByCategory" 
                             class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200">
                          <div class="flex-1">
                            <h4 class="font-medium text-sm text-cost-charcoal">{{ category.name }}</h4>
                            <p *ngIf="category.description" class="text-xs text-gray-500 mt-0.5">{{ category.description }}</p>
                          </div>
                          <div class="flex items-center space-x-2">
                            <button 
                              type="button"
                              (click)="editCategory(category)"
                              class="text-cost-cyan hover:text-cost-teal transition-colors duration-150 p-1 rounded hover:bg-gray-100"
                              [attr.aria-label]="'Edit ' + category.name"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            </button>
                            <button 
                              type="button"
                              (click)="deleteCategory(category)"
                              class="text-red-600 hover:text-red-700 transition-colors duration-150 p-1 rounded hover:bg-red-50"
                              [attr.aria-label]="'Delete ' + category.name"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            </button>
                          </div>
                        </div>
                        <div *ngIf="(tagCategories$ | async)?.length === 0" 
                             class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                          </svg>
                          <p class="text-gray-500 text-sm mb-3">{{ i18nService.t('admin.settingsPage.contentManagement.categories.empty') }}</p>
                          <button 
                            type="button"
                            (click)="addNewCategory()"
                            class="text-sm text-cost-cyan hover:text-cost-teal font-medium"
                          >
                            {{ i18nService.t('admin.settingsPage.contentManagement.categories.addFirst') }}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Tags -->
                    <div>
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="text-sm font-medium text-cost-charcoal">
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.tags') }}
                        </h4>
                        <div class="flex items-center space-x-2">
                          <button 
                            type="button"
                            (click)="suggestTagsWithAI()"
                            class="text-sm text-cost-amber hover:text-amber-600 flex items-center"
                            [disabled]="generatingAI"
                            title="{{ i18nService.t('admin.settingsPage.contentManagement.tags.aiSuggestTooltip') }}"
                          >
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                            {{ i18nService.t('admin.settingsPage.contentManagement.tags.aiSuggestTags') }}
                          </button>
                        </div>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span *ngFor="let tag of tags$ | async; trackBy: trackByTag" 
                              class="inline-flex items-center px-3 py-1.5 rounded-full text-sm transition-all duration-200 hover:shadow-md cursor-pointer group"
                              [style.background-color]="tag.color + '20'"
                              [style.color]="tag.color"
                              [style.border]="'1px solid ' + tag.color + '40'">
                          <svg *ngIf="!tag.icon" class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          </svg>
                          <span *ngIf="tag.icon" class="mr-1.5 text-sm">{{ tag.icon }}</span>
                          <span class="font-medium">{{ tag.name }}</span>
                          <span *ngIf="tag.category" class="ml-2 text-xs opacity-70">({{ getCategoryName(tag.category) }})</span>
                          <div class="ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button 
                              type="button"
                              (click)="editTag(tag); $event.stopPropagation()"
                              class="hover:opacity-70 p-0.5 rounded"
                              [attr.aria-label]="'Edit ' + tag.name"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            </button>
                            <button 
                              type="button"
                              (click)="deleteTag(tag); $event.stopPropagation()"
                              class="hover:opacity-70 p-0.5 rounded"
                              [attr.aria-label]="'Delete ' + tag.name"
                            >
                              <span class="text-sm">×</span>
                            </button>
                          </div>
                        </span>
                        <button 
                          type="button"
                          (click)="addNewTag()"
                          class="inline-flex items-center px-3 py-1 border border-dashed border-gray-400 rounded-full text-sm text-gray-600 hover:border-cost-cyan hover:text-cost-cyan"
                        >
                          <span class="text-sm mr-1">+</span>
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.add') }}
                        </button>
                      </div>
                      
                      <!-- Empty state for tags -->
                      <div *ngIf="(tags$ | async)?.length === 0" 
                           class="mt-4 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path>
                        </svg>
                        <p class="text-gray-500 text-sm mb-3">{{ i18nService.t('admin.settingsPage.contentManagement.tags.empty') }}</p>
                        <button 
                          type="button"
                          (click)="addNewTag()"
                          class="text-sm text-cost-cyan hover:text-cost-teal font-medium"
                        >
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.addFirst') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Original Content Management Form -->
                <div class="bg-white shadow rounded-lg">
                  <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                      {{ i18nService.t('admin.settingsPage.contentManagement.general.title') }}
                    </h3>
                    
                    <form [formGroup]="contentManagementForm" (ngSubmit)="saveContentManagementSettings()">
                      <div class="space-y-6">
                        <!-- Publishing Settings -->
                        <div class="space-y-3">
                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="autoPublishResources"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.autoPublishResources') }}
                            </label>
                          </div>

                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="requireApprovalForPublishing"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.requireApprovalForPublishing') }}
                            </label>
                          </div>
                        </div>

                        <!-- File Upload Settings -->
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label class="block text-sm font-medium text-cost-charcoal mb-1">
                              {{ i18nService.t('admin.settingsPage.contentManagement.maxFileUploadSizeMB') }}
                            </label>
                            <input 
                              type="number" 
                              formControlName="maxFileUploadSizeMB"
                              min="1"
                              max="100"
                              class="input-field"
                            >
                          </div>
                        </div>

                        <!-- Content Features -->
                        <div class="space-y-3">
                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="autoGenerateThumbnails"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.autoGenerateThumbnails') }}
                            </label>
                          </div>

                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="enableContentVersioning"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.enableContentVersioning') }}
                            </label>
                          </div>

                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="searchIndexingEnabled"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.searchIndexingEnabled') }}
                            </label>
                          </div>

                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="autoTaggingEnabled"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.autoTaggingEnabled') }}
                            </label>
                          </div>

                          <div class="flex items-center">
                            <input 
                              type="checkbox" 
                              formControlName="duplicateContentCheck"
                              class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                            >
                            <label class="ml-2 block text-sm text-cost-charcoal">
                              {{ i18nService.t('admin.settingsPage.contentManagement.duplicateContentCheck') }}
                            </label>
                          </div>
                        </div>
                      </div>

                      <!-- Form Actions -->
                      <div class="mt-6 flex justify-end space-x-3">
                        <button 
                          type="button"
                          (click)="resetForm('contentManagement')"
                          class="btn-secondary"
                        >
                          {{ i18nService.t('admin.settingsPage.actions.reset') }}
                        </button>
                        <button 
                          type="submit"
                          [disabled]="contentManagementForm.invalid || saving"
                          [class.opacity-50]="contentManagementForm.invalid || saving"
                          class="btn-primary"
                        >
                          <span *ngIf="!saving">{{ i18nService.t('admin.settingsPage.actions.save') }}</span>
                          <span *ngIf="saving" class="flex items-center">
                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {{ i18nService.t('admin.settingsPage.actions.savingSettings') }}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <!-- Export/Import Settings -->
              <div class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                    Settings Management
                  </h3>
                  
                  <div class="flex flex-wrap gap-3">
                    <button 
                      (click)="exportSettings()"
                      [disabled]="saving"
                      class="btn-secondary"
                    >
                      {{ i18nService.t('admin.settingsPage.actions.export') }}
                    </button>
                    
                    <input 
                      type="file" 
                      #fileInput 
                      accept=".json"
                      (change)="onFileSelected($event)"
                      class="hidden"
                    >
                    <button 
                      (click)="fileInput.click()"
                      [disabled]="saving"
                      class="btn-secondary"
                    >
                      {{ i18nService.t('admin.settingsPage.actions.import') }}
                    </button>

                    <button 
                      (click)="resetAllSettings()"
                      [disabled]="saving"
                      class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {{ i18nService.t('admin.settingsPage.actions.reset') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages with animations -->
    <div *ngIf="showSuccessMessage" 
         class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg flex items-center space-x-2"
         style="animation: fadeInUp 0.3s ease-out">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <div *ngIf="showErrorMessage" 
         class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg flex items-center space-x-2"
         style="animation: fadeInUp 0.3s ease-out">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Resource Type Modal -->
    <app-resource-type-modal
      [isOpen]="isResourceTypeModalOpen"
      [resourceType]="selectedResourceType"
      [existingTypes]="resourceTypes"
      (closeModal)="closeResourceTypeModal()"
      (saveResourceType)="saveResourceType($event)"
    ></app-resource-type-modal>

    <!-- Tag Modal -->
    <app-tag-modal
      [isOpen]="isTagModalOpen"
      [tag]="selectedTag"
      [categories]="(tagCategories$ | async) || []"
      (close)="closeTagModal()"
      (saveTag)="saveTag($event)"
    ></app-tag-modal>

    <!-- Category Modal -->
    <app-category-modal
      [isOpen]="isCategoryModalOpen"
      [category]="selectedCategory"
      (close)="closeCategoryModal()"
      (saveCategory)="saveCategory($event)"
    ></app-category-modal>
  `,
  styles: [`
    .btn-primary {
      @apply bg-cost-teal hover:bg-cost-teal/90 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cost-teal focus:ring-offset-2 transition-colors;
    }

    .btn-secondary {
      @apply bg-gray-200 hover:bg-gray-300 text-cost-charcoal px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors;
    }

    .input-field {
      @apply mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cost-cyan focus:border-cost-cyan sm:text-sm;
    }

    .tab-active {
      @apply bg-cost-teal text-white;
    }

    .tab-inactive {
      @apply text-gray-600 hover:text-cost-charcoal hover:bg-gray-50;
    }

    /* Success animation for feedback */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translate3d(0, 20px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    /* Tag and category hover effects */
    .tag-item:hover {
      transform: translateY(-1px);
      transition: all 150ms ease-out;
    }

    /* Loading pulse for operations */
    @keyframes pulse {
      0%, 100% {
        opacity: 0.8;
      }
      50% {
        opacity: 0.4;
      }
    }

    .loading-state {
      animation: pulse 1.5s ease-in-out infinite;
    }

    .tab-icon-active {
      @apply text-white;
    }

    .tab-icon-inactive {
      @apply text-gray-400 group-hover:text-cost-charcoal;
    }
    
    /* Drag and drop styles */
    .cdk-drag-preview {
      @apply border-2 border-cost-cyan bg-white shadow-lg rounded-lg opacity-90;
    }
    
    .cdk-drag-placeholder {
      @apply opacity-30;
    }
    
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  public settingsService = inject(SettingsService);
  public i18nService = inject(I18nService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // State
  activeTab = 'application';
  saving = false;
  showSuccessMessage = false;
  showErrorMessage = false;
  successMessage = '';
  errorMessage = '';

  // Forms
  applicationForm!: FormGroup;
  userSecurityForm!: FormGroup;
  contentManagementForm!: FormGroup;

  // Tabs configuration
  tabs: SettingsTab[] = [
    { id: 'application', label: 'Application', icon: 'cog', active: true, hasChanges: false },
    { id: 'userSecurity', label: 'User & Security', icon: 'shield', active: false, hasChanges: false },
    { id: 'contentManagement', label: 'Content Management', icon: 'folder', active: false, hasChanges: false }
  ];

  // Content Management Data
  resourceTypes: ResourceTypeSettings[] = [];
  tags$: Observable<TagSettings[]> = this.settingsService.getTags();
  tagCategories$: Observable<CategorySettings[]> = this.settingsService.getCategories();
  
  // Modal state
  isResourceTypeModalOpen = false;
  selectedResourceType: ResourceTypeSettings | null = null;
  
  // Tag and Category modal properties
  isTagModalOpen = false;
  selectedTag: TagSettings | undefined = undefined;
  isCategoryModalOpen = false;
  selectedCategory: CategorySettings | undefined = undefined;
  
  // AI generation state
  generatingAI = false;

  ngOnInit(): void {
    this.initializeForms();
    this.loadSettings();
    this.setupFormChangeDetection();
    
    // Subscribe to resource types to keep array updated
    this.settingsService.getResourceTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(types => {
        this.resourceTypes = types || [];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.applicationForm = this.fb.group({
      siteTitle: ['', Validators.required],
      siteDescription: [''],
      defaultLanguage: ['en'],
      timezone: ['UTC']
    });

    this.userSecurityForm = this.fb.group({
      allowUserRegistration: [true],
      requireEmailVerification: [true],
      passwordMinLength: [8, [Validators.min(6), Validators.max(20)]],
      passwordRequireUppercase: [true],
      passwordRequireNumbers: [true],
      passwordRequireSpecialChars: [false],
      sessionTimeoutMinutes: [480, [Validators.min(15), Validators.max(1440)]],
      maxLoginAttempts: [5, [Validators.min(3), Validators.max(10)]],
      lockoutDurationMinutes: [15, [Validators.min(1), Validators.max(60)]],
      twoFactorAuthEnabled: [false],
      adminApprovalRequired: [false]
    });

    this.contentManagementForm = this.fb.group({
      autoPublishResources: [false],
      requireApprovalForPublishing: [true],
      maxFileUploadSizeMB: [25, [Validators.min(1), Validators.max(100)]],
      allowedFileTypes: [['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png', 'gif']],
      autoGenerateThumbnails: [true],
      enableContentVersioning: [true],
      searchIndexingEnabled: [true],
      autoTaggingEnabled: [false],
      duplicateContentCheck: [true]
    });

  }

  private loadSettings(): void {
    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        if (settings) {
          this.applicationForm.patchValue(settings.application);
          this.userSecurityForm.patchValue(settings.userSecurity);
          this.contentManagementForm.patchValue(settings.contentManagement);
        }
      });
  }

  private setupFormChangeDetection(): void {
    combineLatest([
      this.applicationForm.valueChanges.pipe(startWith(null)),
      this.userSecurityForm.valueChanges.pipe(startWith(null)),
      this.contentManagementForm.valueChanges.pipe(startWith(null))
    ]).pipe(
      takeUntil(this.destroy$),
      map(([app, user, content]) => ({
        application: this.applicationForm.dirty,
        userSecurity: this.userSecurityForm.dirty,
        contentManagement: this.contentManagementForm.dirty
      }))
    ).subscribe(changes => {
      this.tabs.forEach(tab => {
        tab.hasChanges = changes[tab.id as keyof typeof changes] || false;
      });
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.tabs.forEach(tab => {
      tab.active = tab.id === tabId;
    });
  }

  getTabClass(tab: SettingsTab): string {
    return tab.active ? 'tab-active' : 'tab-inactive';
  }

  getTabIconClass(tab: SettingsTab): string {
    return tab.active ? 'tab-icon-active' : 'tab-icon-inactive';
  }

  async saveApplicationSettings(): Promise<void> {
    if (this.applicationForm.invalid) return;

    this.saving = true;
    const settings: ApplicationSettings = this.applicationForm.value;

    try {
      await firstValueFrom(this.settingsService.updateApplicationSettings(settings));
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsSaved'));
      this.applicationForm.markAsPristine();
    } catch (error) {
      this.showError(this.i18nService.t('admin.settingsPage.actions.errorSaving'));
    } finally {
      this.saving = false;
    }
  }

  async saveUserSecuritySettings(): Promise<void> {
    if (this.userSecurityForm.invalid) return;

    this.saving = true;
    const settings: UserSecuritySettings = this.userSecurityForm.value;

    try {
      await firstValueFrom(this.settingsService.updateUserSecuritySettings(settings));
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsSaved'));
      this.userSecurityForm.markAsPristine();
    } catch (error) {
      this.showError(this.i18nService.t('admin.settingsPage.actions.errorSaving'));
    } finally {
      this.saving = false;
    }
  }

  async saveContentManagementSettings(): Promise<void> {
    if (this.contentManagementForm.invalid) return;

    this.saving = true;
    const settings: ContentManagementSettings = this.contentManagementForm.value;

    try {
      await firstValueFrom(this.settingsService.updateContentManagementSettings(settings));
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsSaved'));
      this.contentManagementForm.markAsPristine();
    } catch (error) {
      this.showError(this.i18nService.t('admin.settingsPage.actions.errorSaving'));
    } finally {
      this.saving = false;
    }
  }

  resetForm(formType: string): void {
    const confirmed = confirm(this.i18nService.t('admin.settingsPage.actions.confirmReset'));
    if (!confirmed) return;

    switch (formType) {
      case 'application':
        this.applicationForm.reset();
        break;
      case 'userSecurity':
        this.userSecurityForm.reset();
        break;
      case 'contentManagement':
        this.contentManagementForm.reset();
        break;
    }

    this.loadSettings(); // Reload from server
  }

  async exportSettings(): Promise<void> {
    try {
      const exportData = await firstValueFrom(this.settingsService.exportSettings());
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsExported'));
    } catch (error) {
      this.showError('Failed to export settings');
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        await firstValueFrom(this.settingsService.importSettings(importData));
        this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsImported'));
        this.loadSettings();
      } catch (error) {
        this.showError('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }

  async resetAllSettings(): Promise<void> {
    const confirmed = confirm(this.i18nService.t('admin.settingsPage.actions.confirmReset'));
    if (!confirmed) return;

    try {
      await firstValueFrom(this.settingsService.resetToDefaults());
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsReset'));
      this.loadSettings();
    } catch (error) {
      this.showError('Failed to reset settings');
    }
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.showErrorMessage = true;
    setTimeout(() => {
      this.showErrorMessage = false;
    }, 5000);
  }

  // Resource Type Management Methods
  async toggleResourceType(typeId: string, event: any): Promise<void> {
    const enabled = event.target.checked;
    try {
      await firstValueFrom(this.settingsService.updateResourceType(typeId, { enabled }));
      this.showSuccess(`Resource type ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      this.showError('Failed to update resource type');
      event.target.checked = !enabled; // Revert checkbox
    }
  }

  editResourceType(type: ResourceTypeSettings): void {
    this.selectedResourceType = { ...type };
    this.isResourceTypeModalOpen = true;
  }

  addNewResourceType(): void {
    this.selectedResourceType = null;
    this.isResourceTypeModalOpen = true;
  }
  
  closeResourceTypeModal(): void {
    this.isResourceTypeModalOpen = false;
    this.selectedResourceType = null;
  }
  
  async saveResourceType(resourceType: ResourceTypeSettings): Promise<void> {
    try {
      if (this.selectedResourceType) {
        // Updating existing resource type
        await firstValueFrom(this.settingsService.updateResourceType(resourceType.id, resourceType));
        this.showSuccess('Resource type updated successfully');
      } else {
        // Adding new resource type
        await firstValueFrom(this.settingsService.addResourceType(resourceType));
        this.showSuccess('Resource type added successfully');
      }
      this.closeResourceTypeModal();
    } catch (error) {
      console.error('Error saving resource type:', error);
      this.showError('Failed to save resource type');
    }
  }
  
  // Restore default resource types method - commented out as a fail-safe
  // async restoreDefaultResourceTypes(): Promise<void> {
  //   try {
  //     this.saving = true;
  //     await this.settingsService.restoreDefaultResourceTypes();
  //     this.showSuccess('Default resource types restored successfully with AI-generated cover images');
  //   } catch (error) {
  //     console.error('Error restoring default resource types:', error);
  //     this.showError('Failed to restore default resource types');
  //   } finally {
  //     this.saving = false;
  //   }
  // }
  
  async dropResourceType(event: CdkDragDrop<ResourceTypeSettings[]>): Promise<void> {
    moveItemInArray(this.resourceTypes, event.previousIndex, event.currentIndex);
    
    // Update order values
    this.resourceTypes.forEach((type, index) => {
      type.order = index;
    });
    
    try {
      // Save the new order to Firestore
      await firstValueFrom(this.settingsService.updateResourceTypes(this.resourceTypes));
      this.showSuccess('Resource type order updated');
    } catch (error) {
      console.error('Error updating resource type order:', error);
      this.showError('Failed to update order');
      // Revert on error
      this.loadSettings();
    }
  }

  async deleteResourceType(type: ResourceTypeSettings): Promise<void> {
    // Prevent deletion of "other" type
    if (type.id === 'other') {
      this.showError(this.i18nService.t('admin.settingsPage.actions.cannotDeleteOther'));
      return;
    }

    // Count resources that will be affected
    const resourceCount = await firstValueFrom(this.settingsService.getResourceCountByType(type.id));
    
    const messageKey = resourceCount > 0 
      ? 'admin.settingsPage.actions.confirmDeleteResourceType'
      : 'admin.settingsPage.actions.confirmDeleteResourceTypeNoResources';
    
    const message = this.i18nService.t(messageKey, { name: type.label, count: resourceCount });
    
    if (confirm(message)) {
      try {
        this.saving = true;
        await firstValueFrom(this.settingsService.deleteResourceType(type.id));
        this.showSuccess(this.i18nService.t('admin.settingsPage.actions.resourceTypeDeleted', { name: type.label }));
      } catch (error) {
        console.error('Error deleting resource type:', error);
        this.showError(this.i18nService.t('admin.settingsPage.actions.failedToDeleteResourceType'));
      } finally {
        this.saving = false;
      }
    }
  }

  // Tag Management Methods
  editTag(tag: TagSettings): void {
    this.selectedTag = { ...tag };
    this.isTagModalOpen = true;
  }

  addNewTag(): void {
    this.selectedTag = undefined;
    this.isTagModalOpen = true;
  }

  editCategory(category: CategorySettings): void {
    this.selectedCategory = { ...category };
    this.isCategoryModalOpen = true;
  }

  // Tag Modal Methods
  closeTagModal(): void {
    this.isTagModalOpen = false;
    this.selectedTag = undefined;
  }

  async saveTag(tag: TagSettings): Promise<void> {
    try {
      const tags = await firstValueFrom(this.tags$);
      const updatedTags = this.selectedTag 
        ? tags.map(t => t.id === tag.id ? tag : t)
        : [...tags, tag];
      
      await firstValueFrom(this.settingsService.updateTags(updatedTags));
      this.showSuccess(this.selectedTag ? 'Tag updated successfully' : 'Tag added successfully');
      this.closeTagModal();
    } catch (error) {
      console.error('Error saving tag:', error);
      this.showError('Failed to save tag');
    }
  }

  // Category Modal Methods
  closeCategoryModal(): void {
    this.isCategoryModalOpen = false;
    this.selectedCategory = undefined;
  }

  async saveCategory(category: CategorySettings): Promise<void> {
    try {
      const categories = await firstValueFrom(this.tagCategories$);
      const updatedCategories = this.selectedCategory
        ? categories.map(c => c.id === category.id ? category : c)
        : [...categories, category];
      
      await firstValueFrom(this.settingsService.updateCategories(updatedCategories));
      this.showSuccess(this.selectedCategory ? 'Category updated successfully' : 'Category added successfully');
      this.closeCategoryModal();
    } catch (error) {
      console.error('Error saving category:', error);
      this.showError('Failed to save category');
    }
  }

  // Add new category method
  addNewCategory(): void {
    this.selectedCategory = undefined;
    this.isCategoryModalOpen = true;
  }

  // Delete methods
  async deleteTag(tag: TagSettings): Promise<void> {
    if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      try {
        const tags = await firstValueFrom(this.tags$);
        const updatedTags = tags.filter(t => t.id !== tag.id);
        await firstValueFrom(this.settingsService.updateTags(updatedTags));
        this.showSuccess(`Tag "${tag.name}" deleted successfully`);
      } catch (error) {
        console.error('Error deleting tag:', error);
        this.showError('Failed to delete tag');
      }
    }
  }

  async deleteCategory(category: CategorySettings): Promise<void> {
    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      try {
        const categories = await firstValueFrom(this.tagCategories$);
        const updatedCategories = categories.filter(c => c.id !== category.id);
        await firstValueFrom(this.settingsService.updateCategories(updatedCategories));
        this.showSuccess(`Category "${category.name}" deleted successfully`);
      } catch (error) {
        console.error('Error deleting category:', error);
        this.showError('Failed to delete category');
      }
    }
  }

  // Helper methods
  getCategoryName(categoryId: string): string {
    // This is a synchronous helper for the template
    // In a real app, you might want to handle this differently
    return '';
  }

  trackByTag(index: number, tag: TagSettings): string {
    return tag.id;
  }

  trackByCategory(index: number, category: CategorySettings): string {
    return category.id;
  }

  // AI Suggestion Methods
  async generateAISuggestions(): Promise<void> {
    if (confirm('Generate comprehensive categories and tags using AI? This will analyze CoST goals and create relevant suggestions.')) {
      try {
        this.generatingAI = true;
        
        // Get authentication token
        const authService = (this.settingsService as any).authService;
        const user = authService.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        const idToken = await user.getIdToken();
        
        const functionUrl = environment.production 
          ? 'https://suggestcategoriesandtags-knowledgehub-2ed2f.cloudfunctions.net'
          : 'http://localhost:5001/knowledgehub-2ed2f/us-central1/suggestCategoriesAndTags';
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ generateDefaults: true })
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate suggestions');
        }
        
        const result = await response.json();
        const { categories, tags } = result.result;
        
        // Show preview and confirm
        const message = `AI generated ${categories.length} categories and ${tags.length} tags. Do you want to add them?`;
        if (confirm(message)) {
          // Get current categories and tags
          const currentCategories = await firstValueFrom(this.tagCategories$);
          const currentTags = await firstValueFrom(this.tags$);
          
          // Merge with new suggestions
          const updatedCategories = [...currentCategories, ...categories];
          const updatedTags = [...currentTags, ...tags];
          
          // Update using existing methods
          await firstValueFrom(this.settingsService.updateCategories(updatedCategories));
          await firstValueFrom(this.settingsService.updateTags(updatedTags));
          
          this.showSuccess(`Successfully added ${categories.length} categories and ${tags.length} tags`);
        }
      } catch (error) {
        console.error('Error generating AI suggestions:', error);
        this.showError('Failed to generate AI suggestions');
      } finally {
        this.generatingAI = false;
      }
    }
  }
  
  async suggestCategoriesWithAI(): Promise<void> {
    // Similar to generateAISuggestions but only for categories
    this.showSuccess('Category suggestions coming soon!');
  }
  
  async suggestTagsWithAI(): Promise<void> {
    // Similar to generateAISuggestions but only for tags
    this.showSuccess('Tag suggestions coming soon!');
  }
}