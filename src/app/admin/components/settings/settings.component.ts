import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, combineLatest, firstValueFrom, Observable } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';

import { SettingsService } from './services/settings.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ResourceTypeModalComponent } from './components/resource-type-modal/resource-type-modal.component';
import { 
  SettingsData, 
  SettingsTab, 
  ApplicationSettings, 
  UserSecuritySettings,
  ContentManagementSettings,
  SystemAdministrationSettings,
  ResourceTypeSettings,
  TagSettings,
  CategorySettings
} from './models/settings.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ResourceTypeModalComponent],
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

                      <!-- Email Notifications -->
                      <div class="sm:col-span-2">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="emailNotifications"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.application.emailNotifications') }}
                          </label>
                        </div>
                      </div>

                      <!-- Analytics Enabled -->
                      <div class="sm:col-span-2">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="analyticsEnabled"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.application.analyticsEnabled') }}
                          </label>
                        </div>
                      </div>

                      <!-- Analytics Tracking ID -->
                      <div class="sm:col-span-2" *ngIf="applicationForm.get('analyticsEnabled')?.value">
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.analyticsTrackingId') }}
                        </label>
                        <input 
                          type="text" 
                          formControlName="analyticsTrackingId"
                          class="input-field"
                          placeholder="UA-XXXXXXXXX-X"
                        >
                      </div>

                      <!-- Maintenance Mode -->
                      <div class="sm:col-span-2">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="maintenanceMode"
                            class="h-4 w-4 text-cost-amber focus:ring-cost-amber border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.application.maintenanceMode') }}
                          </label>
                        </div>
                      </div>

                      <!-- Maintenance Message -->
                      <div class="sm:col-span-2" *ngIf="applicationForm.get('maintenanceMode')?.value">
                        <label class="block text-sm font-medium text-cost-charcoal mb-1">
                          {{ i18nService.t('admin.settingsPage.application.maintenanceMessage') }}
                        </label>
                        <textarea 
                          formControlName="maintenanceMessage"
                          rows="3"
                          class="input-field"
                          [placeholder]="i18nService.t('admin.settingsPage.application.maintenanceMessage')"
                        ></textarea>
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
                    
                    <!-- Resource Types List -->
                    <div class="space-y-3">
                      <div *ngFor="let type of resourceTypes$ | async" 
                           class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div class="flex items-center space-x-3">
                          <img 
                            *ngIf="type.defaultCover"
                            [src]="type.defaultCover" 
                            alt="{{ type.label }}" 
                            class="w-12 h-12 object-cover rounded"
                          />
                          <div *ngIf="!type.defaultCover" class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <span class="material-icons text-gray-400">image</span>
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
                          >
                            <span class="material-icons">edit</span>
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        (click)="addNewResourceType()"
                        class="btn-secondary w-full"
                      >
                        <span class="material-icons mr-2">add</span>
                        {{ i18nService.t('admin.settingsPage.contentManagement.resourceTypes.add') }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Tags & Categories Section -->
                <div class="bg-white shadow rounded-lg">
                  <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                      {{ i18nService.t('admin.settingsPage.contentManagement.tags.title') }}
                    </h3>
                    
                    <!-- Categories -->
                    <div class="mb-6">
                      <h4 class="text-sm font-medium text-cost-charcoal mb-3">
                        {{ i18nService.t('admin.settingsPage.contentManagement.tags.categories') }}
                      </h4>
                      <div class="space-y-2">
                        <div *ngFor="let category of tagCategories$ | async" 
                             class="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span class="font-medium text-sm">{{ category.name }}</span>
                          <button 
                            type="button"
                            (click)="editCategory(category)"
                            class="text-cost-cyan hover:text-cost-teal"
                          >
                            <span class="material-icons text-sm">edit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Tags -->
                    <div>
                      <h4 class="text-sm font-medium text-cost-charcoal mb-3">
                        {{ i18nService.t('admin.settingsPage.contentManagement.tags.tags') }}
                      </h4>
                      <div class="flex flex-wrap gap-2">
                        <span *ngFor="let tag of tags$ | async" 
                              class="inline-flex items-center px-3 py-1 rounded-full text-sm"
                              [style.background-color]="tag.color + '20'"
                              [style.color]="tag.color">
                          <span class="material-icons mr-1 text-sm">{{ tag.icon || 'label' }}</span>
                          {{ tag.name }}
                          <button 
                            type="button"
                            (click)="editTag(tag)"
                            class="ml-2 hover:opacity-70"
                          >
                            <span class="material-icons text-sm">edit</span>
                          </button>
                        </span>
                        <button 
                          type="button"
                          (click)="addNewTag()"
                          class="inline-flex items-center px-3 py-1 border border-dashed border-gray-400 rounded-full text-sm text-gray-600 hover:border-cost-cyan hover:text-cost-cyan"
                        >
                          <span class="material-icons mr-1 text-sm">add</span>
                          {{ i18nService.t('admin.settingsPage.contentManagement.tags.add') }}
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

              <!-- System Administration Settings -->
              <div *ngIf="activeTab === 'systemAdministration'" class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3 class="text-lg leading-6 font-medium text-cost-charcoal mb-4">
                    {{ i18nService.t('admin.settingsPage.systemAdministration.title') }}
                  </h3>
                  
                  <form [formGroup]="systemAdministrationForm" (ngSubmit)="saveSystemAdministrationSettings()">
                    <div class="space-y-6">
                      <!-- Logging Settings -->
                      <div>
                        <div class="flex items-center mb-4">
                          <input 
                            type="checkbox" 
                            formControlName="enableSystemLogs"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.enableSystemLogs') }}
                          </label>
                        </div>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" *ngIf="systemAdministrationForm.get('enableSystemLogs')?.value">
                          <div>
                            <label class="block text-sm font-medium text-cost-charcoal mb-1">
                              {{ i18nService.t('admin.settingsPage.systemAdministration.logLevel') }}
                            </label>
                            <select formControlName="logLevel" class="input-field">
                              <option value="error">Error</option>
                              <option value="warn">Warning</option>
                              <option value="info">Info</option>
                              <option value="debug">Debug</option>
                            </select>
                          </div>

                          <div>
                            <label class="block text-sm font-medium text-cost-charcoal mb-1">
                              {{ i18nService.t('admin.settingsPage.systemAdministration.logRetentionDays') }}
                            </label>
                            <input 
                              type="number" 
                              formControlName="logRetentionDays"
                              min="1"
                              max="365"
                              class="input-field"
                            >
                          </div>
                        </div>
                      </div>

                      <!-- Performance & Monitoring -->
                      <div class="space-y-3">
                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="enablePerformanceMonitoring"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.enablePerformanceMonitoring') }}
                          </label>
                        </div>

                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="enableCacheOptimization"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.enableCacheOptimization') }}
                          </label>
                        </div>

                        <div class="flex items-center">
                          <input 
                            type="checkbox" 
                            formControlName="enableRateLimiting"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.enableRateLimiting') }}
                          </label>
                        </div>
                      </div>

                      <!-- Cache & Rate Limiting Settings -->
                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div *ngIf="systemAdministrationForm.get('enableCacheOptimization')?.value">
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.cacheExpirationMinutes') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="cacheExpirationMinutes"
                            min="1"
                            max="1440"
                            class="input-field"
                          >
                        </div>

                        <div *ngIf="systemAdministrationForm.get('enableRateLimiting')?.value">
                          <label class="block text-sm font-medium text-cost-charcoal mb-1">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.apiRateLimitPerMinute') }}
                          </label>
                          <input 
                            type="number" 
                            formControlName="apiRateLimitPerMinute"
                            min="10"
                            max="1000"
                            class="input-field"
                          >
                        </div>
                      </div>

                      <!-- Backup Settings -->
                      <div>
                        <div class="flex items-center mb-4">
                          <input 
                            type="checkbox" 
                            formControlName="enableAutoBackup"
                            class="h-4 w-4 text-cost-cyan focus:ring-cost-cyan border-gray-300 rounded"
                          >
                          <label class="ml-2 block text-sm text-cost-charcoal">
                            {{ i18nService.t('admin.settingsPage.systemAdministration.enableAutoBackup') }}
                          </label>
                        </div>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" *ngIf="systemAdministrationForm.get('enableAutoBackup')?.value">
                          <div>
                            <label class="block text-sm font-medium text-cost-charcoal mb-1">
                              {{ i18nService.t('admin.settingsPage.systemAdministration.backupFrequency') }}
                            </label>
                            <select formControlName="backupFrequency" class="input-field">
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>

                          <div>
                            <label class="block text-sm font-medium text-cost-charcoal mb-1">
                              {{ i18nService.t('admin.settingsPage.systemAdministration.backupRetentionDays') }}
                            </label>
                            <input 
                              type="number" 
                              formControlName="backupRetentionDays"
                              min="1"
                              max="365"
                              class="input-field"
                            >
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="mt-6 flex justify-end space-x-3">
                      <button 
                        type="button"
                        (click)="resetForm('systemAdministration')"
                        class="btn-secondary"
                      >
                        {{ i18nService.t('admin.settingsPage.actions.reset') }}
                      </button>
                      <button 
                        type="submit"
                        [disabled]="systemAdministrationForm.invalid || saving"
                        [class.opacity-50]="systemAdministrationForm.invalid || saving"
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

    <!-- Success/Error Messages -->
    <div *ngIf="showSuccessMessage" class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg">
      {{ successMessage }}
    </div>

    <div *ngIf="showErrorMessage" class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg">
      {{ errorMessage }}
    </div>

    <!-- Resource Type Modal -->
    <app-resource-type-modal
      [isOpen]="isResourceTypeModalOpen"
      [resourceType]="selectedResourceType"
      [existingTypes]="resourceTypes"
      (closeModal)="closeResourceTypeModal()"
      (saveResourceType)="saveResourceType($event)"
    ></app-resource-type-modal>
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

    .tab-icon-active {
      @apply text-white;
    }

    .tab-icon-inactive {
      @apply text-gray-400 group-hover:text-cost-charcoal;
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
  systemAdministrationForm!: FormGroup;

  // Tabs configuration
  tabs: SettingsTab[] = [
    { id: 'application', label: 'Application', icon: 'cog', active: true, hasChanges: false },
    { id: 'userSecurity', label: 'User & Security', icon: 'shield', active: false, hasChanges: false },
    { id: 'contentManagement', label: 'Content Management', icon: 'folder', active: false, hasChanges: false },
    { id: 'systemAdministration', label: 'System Administration', icon: 'server', active: false, hasChanges: false }
  ];

  // Content Management Observables
  resourceTypes$: Observable<ResourceTypeSettings[]> = this.settingsService.getResourceTypes();
  tags$: Observable<TagSettings[]> = this.settingsService.getTags();
  tagCategories$: Observable<CategorySettings[]> = this.settingsService.getCategories();
  
  // Modal state
  isResourceTypeModalOpen = false;
  selectedResourceType: ResourceTypeSettings | null = null;
  resourceTypes: ResourceTypeSettings[] = [];

  ngOnInit(): void {
    this.initializeForms();
    this.loadSettings();
    this.setupFormChangeDetection();
    
    // Subscribe to resource types to keep array updated
    this.resourceTypes$
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
      timezone: ['UTC'],
      emailNotifications: [true],
      analyticsEnabled: [false],
      analyticsTrackingId: [''],
      maintenanceMode: [false],
      maintenanceMessage: ['']
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

    this.systemAdministrationForm = this.fb.group({
      enableSystemLogs: [true],
      logLevel: ['info'],
      logRetentionDays: [30, [Validators.min(1), Validators.max(365)]],
      enablePerformanceMonitoring: [true],
      enableAutoBackup: [true],
      backupFrequency: ['daily'],
      backupRetentionDays: [7, [Validators.min(1), Validators.max(365)]],
      enableCacheOptimization: [true],
      cacheExpirationMinutes: [60, [Validators.min(1), Validators.max(1440)]],
      enableRateLimiting: [true],
      apiRateLimitPerMinute: [100, [Validators.min(10), Validators.max(1000)]]
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
          this.systemAdministrationForm.patchValue(settings.systemAdministration);
        }
      });
  }

  private setupFormChangeDetection(): void {
    combineLatest([
      this.applicationForm.valueChanges.pipe(startWith(null)),
      this.userSecurityForm.valueChanges.pipe(startWith(null)),
      this.contentManagementForm.valueChanges.pipe(startWith(null)),
      this.systemAdministrationForm.valueChanges.pipe(startWith(null))
    ]).pipe(
      takeUntil(this.destroy$),
      map(([app, user, content, system]) => ({
        application: this.applicationForm.dirty,
        userSecurity: this.userSecurityForm.dirty,
        contentManagement: this.contentManagementForm.dirty,
        systemAdministration: this.systemAdministrationForm.dirty
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

  async saveSystemAdministrationSettings(): Promise<void> {
    if (this.systemAdministrationForm.invalid) return;

    this.saving = true;
    const settings: SystemAdministrationSettings = this.systemAdministrationForm.value;

    try {
      await firstValueFrom(this.settingsService.updateSystemAdministrationSettings(settings));
      this.showSuccess(this.i18nService.t('admin.settingsPage.actions.settingsSaved'));
      this.systemAdministrationForm.markAsPristine();
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
      case 'systemAdministration':
        this.systemAdministrationForm.reset();
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

  // Tag Management Methods
  editTag(tag: TagSettings): void {
    // TODO: Open modal/dialog for editing tag
    console.log('Edit tag:', tag);
    // This would typically open a modal with a form to edit the tag
    this.showSuccess('Tag editing not yet implemented');
  }

  addNewTag(): void {
    // TODO: Open modal/dialog for adding new tag
    console.log('Add new tag');
    // This would typically open a modal with a form to create a new tag
    this.showSuccess('Adding new tags not yet implemented');
  }

  editCategory(category: CategorySettings): void {
    // TODO: Open modal/dialog for editing category
    console.log('Edit category:', category);
    // This would typically open a modal with a form to edit the category
    this.showSuccess('Category editing not yet implemented');
  }
}