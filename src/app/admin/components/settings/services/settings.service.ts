import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of, from, firstValueFrom } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from '@angular/fire/firestore';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivityService } from '../../../../core/services/activity.service';
import { 
  SettingsData, 
  ApplicationSettings, 
  UserSecuritySettings,
  ContentManagementSettings,
  SystemAdministrationSettings,
  IntegrationSettings,
  SettingsExportData,
  SettingsValidationError,
  ResourceTypeSettings,
  TagSettings,
  CategorySettings,
  LanguageConfig,
  WorkflowConfig,
  FileTypeConfig
} from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private activityService = inject(ActivityService);

  private settingsSubject = new BehaviorSubject<SettingsData | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private readonly SETTINGS_COLLECTION = 'settings';
  private readonly SETTINGS_DOC_ID = 'main_config';

  constructor() {
    // Load settings on service initialization
    this.loadSettings().subscribe({
      next: () => {
        console.log('Settings loaded successfully');
      },
      error: (error) => {
        console.error('Failed to load settings on init:', error);
      }
    });
  }

  /**
   * Load current settings from Firestore
   */
  loadSettings(): Observable<SettingsData> {
    this.loadingSubject.next(true);
    
    // Check if user is authenticated (basic check)
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      console.warn('Settings accessed without authentication - loading defaults');
    }
    
    const docRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    
    return from(getDoc(docRef)).pipe(
      map(docSnapshot => {
        if (docSnapshot.exists()) {
          const settings = docSnapshot.data() as SettingsData;
          this.settingsSubject.next(settings);
          return settings;
        } else {
          // Create default settings if none exist
          const defaultSettings = this.getDefaultSettings();
          this.settingsSubject.next(defaultSettings);
          
          // Save default settings asynchronously without blocking the current observable
          this.saveSettings(defaultSettings).subscribe({
            next: () => console.log('Default settings saved'),
            error: (error) => console.error('Failed to save default settings:', error)
          });
          
          return defaultSettings;
        }
      }),
      catchError(error => {
        console.error('Error loading settings:', error);
        this.loadingSubject.next(false); // Ensure loading is stopped on error
        const defaultSettings = this.getDefaultSettings();
        this.settingsSubject.next(defaultSettings);
        return of(defaultSettings);
      }),
      tap(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Save settings to Firestore
   */
  saveSettings(settings: SettingsData): Observable<void> {
    this.loadingSubject.next(true);
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('Authentication required to save settings'));
    }

    // Log user info for debugging
    console.log('Current user:', {
      uid: currentUser.uid,
      email: currentUser.email,
      customClaims: currentUser
    });

    // Check if user has admin claim
    return from(currentUser.getIdTokenResult()).pipe(
      switchMap(tokenResult => {
        console.log('User token claims:', tokenResult.claims);
        
        if (!tokenResult.claims['admin']) {
          this.loadingSubject.next(false);
          return throwError(() => new Error('Admin privileges required to save settings'));
        }

        return this.performSave(settings, currentUser);
      }),
      catchError(error => {
        console.error('Error in saveSettings:', error);
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  private performSave(settings: SettingsData, currentUser: any): Observable<void> {
    const updatedSettings: SettingsData = {
      ...settings,
      lastUpdated: new Date(),
      updatedBy: currentUser?.uid || 'system',
      version: this.generateVersion()
    };

    console.log('Saving settings to Firestore:', updatedSettings);
    console.log('Resource types being saved:', updatedSettings.contentManagement?.resourceTypes);

    const docRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    
    return from(setDoc(docRef, updatedSettings, { merge: true })).pipe(
      tap(() => {
        this.settingsSubject.next(updatedSettings);
        this.logSettingsChange('settings_updated', updatedSettings);
      }),
      catchError(error => {
        console.error('Error saving settings:', error);
        this.loadingSubject.next(false); // Ensure loading is stopped on error
        return throwError(() => new Error('Failed to save settings: ' + error.message));
      }),
      tap(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Update application settings
   */
  updateApplicationSettings(settings: ApplicationSettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedSettings: SettingsData = {
      ...currentSettings,
      application: settings
    };

    return this.saveSettings(updatedSettings);
  }

  /**
   * Update user security settings
   */
  updateUserSecuritySettings(settings: UserSecuritySettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedSettings: SettingsData = {
      ...currentSettings,
      userSecurity: settings
    };

    return this.saveSettings(updatedSettings);
  }

  /**
   * Update content management settings
   */
  updateContentManagementSettings(settings: ContentManagementSettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedSettings: SettingsData = {
      ...currentSettings,
      contentManagement: settings
    };

    return this.saveSettings(updatedSettings);
  }

  /**
   * Update system administration settings
   */
  updateSystemAdministrationSettings(settings: SystemAdministrationSettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedSettings: SettingsData = {
      ...currentSettings,
      systemAdministration: settings
    };

    return this.saveSettings(updatedSettings);
  }

  /**
   * Update integration settings
   */
  updateIntegrationSettings(settings: IntegrationSettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedSettings: SettingsData = {
      ...currentSettings,
      integrations: settings
    };

    return this.saveSettings(updatedSettings);
  }

  /**
   * Validate settings data
   */
  validateSettings(settings: SettingsData): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];

    // Application settings validation
    if (!settings.application.siteTitle?.trim()) {
      errors.push({
        field: 'application.siteTitle',
        message: 'Site title is required',
        severity: 'error'
      });
    }

    if (settings.userSecurity.passwordMinLength && settings.userSecurity.passwordMinLength < 8) {
      errors.push({
        field: 'userSecurity.passwordMinLength',
        message: 'Password minimum length should be at least 8 characters',
        severity: 'warning'
      });
    }

    // File size validation
    if (settings.contentManagement.mediaSettings?.maxFileUploadSizeMB && 
        settings.contentManagement.mediaSettings.maxFileUploadSizeMB > 100) {
      errors.push({
        field: 'contentManagement.mediaSettings.maxFileUploadSizeMB',
        message: 'Large file sizes may cause performance issues',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Export settings data
   */
  exportSettings(): Observable<SettingsExportData> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('No settings to export'));
    }

    const currentUser = this.authService.currentUser;
    const exportData: SettingsExportData = {
      settings: currentSettings,
      exportedAt: new Date(),
      exportedBy: currentUser?.uid || 'system',
      version: currentSettings.version,
      checksum: this.generateChecksum(currentSettings)
    };

    this.logSettingsChange('settings_exported', currentSettings);
    return of(exportData);
  }

  /**
   * Import settings data
   */
  importSettings(importData: SettingsExportData): Observable<void> {
    // Validate checksum
    const calculatedChecksum = this.generateChecksum(importData.settings);
    if (calculatedChecksum !== importData.checksum) {
      return throwError(() => new Error('Settings data appears to be corrupted'));
    }

    // Validate settings
    const errors = this.validateSettings(importData.settings);
    const criticalErrors = errors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      return throwError(() => new Error('Settings validation failed: ' + criticalErrors[0].message));
    }

    return this.saveSettings(importData.settings).pipe(
      tap(() => this.logSettingsChange('settings_imported', importData.settings))
    );
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): Observable<void> {
    const defaultSettings = this.getDefaultSettings();
    return this.saveSettings(defaultSettings).pipe(
      tap(() => this.logSettingsChange('settings_reset', defaultSettings))
    );
  }

  /**
   * Get resource types from settings
   */
  getResourceTypes(): Observable<ResourceTypeSettings[]> {
    return this.settings$.pipe(
      map(settings => settings?.contentManagement?.resourceTypes || this.getDefaultResourceTypes())
    );
  }

  /**
   * Update resource types
   */
  updateResourceTypes(resourceTypes: ResourceTypeSettings[]): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    console.log('Updating resource types:', resourceTypes);
    console.log('Current settings before update:', currentSettings);

    const updatedContentManagement: ContentManagementSettings = {
      ...currentSettings.contentManagement,
      resourceTypes
    };

    return this.updateContentManagementSettings(updatedContentManagement);
  }

  /**
   * Add a new resource type
   */
  addResourceType(resourceType: ResourceTypeSettings): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const resourceTypes = currentSettings.contentManagement.resourceTypes || [];
    const newResourceTypes = [...resourceTypes, resourceType];

    return this.updateResourceTypes(newResourceTypes);
  }

  /**
   * Update a specific resource type
   */
  updateResourceType(id: string, updates: Partial<ResourceTypeSettings>): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const resourceTypes = currentSettings.contentManagement.resourceTypes || [];
    const updatedTypes = resourceTypes.map(type => 
      type.id === id ? { ...type, ...updates } : type
    );

    return this.updateResourceTypes(updatedTypes);
  }

  /**
   * Get tags from settings
   */
  getTags(): Observable<TagSettings[]> {
    return this.settings$.pipe(
      map(settings => settings?.contentManagement?.tagManagement?.tags || [])
    );
  }

  /**
   * Update tags
   */
  updateTags(tags: TagSettings[]): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedContentManagement: ContentManagementSettings = {
      ...currentSettings.contentManagement,
      tagManagement: {
        ...currentSettings.contentManagement.tagManagement,
        tags
      }
    };

    return this.updateContentManagementSettings(updatedContentManagement);
  }

  /**
   * Get categories from settings
   */
  getCategories(): Observable<CategorySettings[]> {
    return this.settings$.pipe(
      map(settings => settings?.contentManagement?.tagManagement?.categories || [])
    );
  }

  /**
   * Update categories
   */
  updateCategories(categories: CategorySettings[]): Observable<void> {
    const currentSettings = this.settingsSubject.value;
    if (!currentSettings) {
      return throwError(() => new Error('Settings not loaded'));
    }

    const updatedContentManagement: ContentManagementSettings = {
      ...currentSettings.contentManagement,
      tagManagement: {
        ...currentSettings.contentManagement.tagManagement,
        categories
      }
    };

    return this.updateContentManagementSettings(updatedContentManagement);
  }

  /**
   * Get default resource types
   */
  private getDefaultResourceTypes(): ResourceTypeSettings[] {
    return [
      {
        id: 'guidance',
        label: 'Implementation Guidance',
        icon: 'book',
        description: 'Guides and best practices for implementation',
        enabled: true,
        order: 1
      },
      {
        id: 'case-study',
        label: 'Case Study',
        icon: 'flag',
        description: 'Real-world examples and success stories',
        enabled: true,
        order: 2
      },
      {
        id: 'report',
        label: 'Report',
        icon: 'description',
        description: 'Research reports and findings',
        enabled: true,
        order: 3
      },
      {
        id: 'dataset',
        label: 'Dataset',
        icon: 'storage',
        description: 'Data files and statistics',
        enabled: true,
        order: 4
      },
      {
        id: 'tool',
        label: 'Tool',
        icon: 'build',
        description: 'Tools and utilities',
        enabled: true,
        order: 5
      },
      {
        id: 'policy',
        label: 'Policy',
        icon: 'gavel',
        description: 'Policy documents and frameworks',
        enabled: true,
        order: 6
      },
      {
        id: 'template',
        label: 'Template',
        icon: 'content_copy',
        description: 'Reusable templates and forms',
        enabled: true,
        order: 7
      },
      {
        id: 'infographic',
        label: 'Infographic',
        icon: 'image',
        description: 'Visual information and graphics',
        enabled: true,
        order: 8
      },
      {
        id: 'independent-review',
        label: 'Independent Review',
        icon: 'fact_check',
        description: 'CoST independent review reports',
        enabled: true,
        order: 9
      },
      {
        id: 'other',
        label: 'Other',
        icon: 'folder',
        description: 'Other types of resources',
        enabled: true,
        order: 10
      }
    ];
  }

  /**
   * Restore all default resource types with AI-generated cover images
   */
  async restoreDefaultResourceTypes(): Promise<void> {
    const defaultTypes = this.getDefaultResourceTypes();
    const typesWithCovers: ResourceTypeSettings[] = [];
    
    for (const type of defaultTypes) {
      // Generate a unique seed for each resource type based on its properties
      const seed = `${type.id}-${type.label}-${type.description}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const width = 800;
      const height = 400;
      
      // Use Lorem Picsum with consistent seed for each type
      const coverUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
      
      typesWithCovers.push({
        ...type,
        defaultCover: coverUrl
      });
    }
    
    // Update all resource types at once
    await firstValueFrom(this.updateResourceTypes(typesWithCovers));
  }

  /**
   * Get default settings configuration
   */
  private getDefaultSettings(): SettingsData {
    const currentUser = this.authService.currentUser;
    
    return {
      application: {
        siteTitle: 'CoST Knowledge Hub',
        siteDescription: 'Infrastructure Transparency Knowledge Hub',
        defaultLanguage: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        analyticsEnabled: false,
        maintenanceMode: false
      },
      userSecurity: {
        allowUserRegistration: true,
        requireEmailVerification: true,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: false,
        sessionTimeoutMinutes: 480, // 8 hours
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        twoFactorAuthEnabled: false,
        adminApprovalRequired: false
      },
      contentManagement: {
        // Resource Types
        resourceTypes: this.getDefaultResourceTypes(),
        defaultResourceType: 'guidance',
        
        // Tag Management
        tagManagement: {
          tags: this.getDefaultTags(),
          categories: this.getDefaultCategories(),
          enableAutoTagging: false,
          maxTagsPerResource: 10
        },
        
        // Publishing
        autoPublishResources: false,
        requireApprovalForPublishing: true,
        publishingWorkflow: {
          workflows: [],
          defaultWorkflow: 'standard',
          requireApproval: true,
          approvalLevels: 1
        },
        
        // Media Settings
        mediaSettings: {
          maxFileUploadSizeMB: 25,
          allowedFileTypes: this.getDefaultFileTypes(),
          autoGenerateThumbnails: true,
          thumbnailSizes: [
            { name: 'small', width: 150, height: 150, crop: true },
            { name: 'medium', width: 300, height: 300, crop: false },
            { name: 'large', width: 600, height: 600, crop: false }
          ],
          imageOptimization: true,
          cdnEnabled: false
        },
        
        // AI Settings
        aiSettings: {
          enableAISummaries: false,
          enableAITags: false,
          enableAIImageSuggestions: false,
          aiProvider: 'gemini',
          defaultPrompts: {}
        },
        
        // Search Settings
        searchSettings: {
          searchProvider: 'firestore',
          searchWeights: {
            title: 3,
            description: 2,
            content: 1,
            tags: 2
          },
          enableSynonyms: false,
          enableFeaturedResults: true,
          autocompleteSuggestions: 5
        },
        
        // Homepage Settings
        homepageSettings: {
          heroContent: {
            title: 'CoST Knowledge Hub',
            subtitle: 'Infrastructure Transparency Resources',
          },
          featuredResources: [],
          topicHighlights: [],
          showStatistics: true,
          customBlocks: []
        },
        
        // Analytics Settings
        analyticsSettings: {
          enableAnalytics: false,
          customMetrics: [],
          reportingPeriods: ['daily', 'weekly', 'monthly'],
          exportFormats: ['csv', 'excel', 'pdf'],
          dashboardWidgets: ['pageViews', 'downloads', 'topResources', 'searchTerms']
        },
        
        // Language Settings
        languageSettings: {
          supportedLanguages: [
            { code: 'en', name: 'English', nativeName: 'English', enabled: true, isDefault: true },
            { code: 'es', name: 'Spanish', nativeName: 'Español', enabled: true, isDefault: false },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português', enabled: true, isDefault: false }
          ],
          defaultLanguage: 'en',
          autoTranslate: false
        },
        
        // Legacy fields
        enableContentVersioning: true,
        duplicateContentCheck: true
      },
      systemAdministration: {
        enableSystemLogs: true,
        logLevel: 'info',
        logRetentionDays: 30,
        enablePerformanceMonitoring: true,
        enableAutoBackup: true,
        backupFrequency: 'daily',
        backupRetentionDays: 7,
        enableCacheOptimization: true,
        cacheExpirationMinutes: 60,
        enableRateLimiting: true,
        apiRateLimitPerMinute: 100
      },
      integrations: {
        firebaseProjectId: 'knowledgehub-2ed2f',
        emailServiceProvider: 'firebase',
        cdnEnabled: false,
        storageProvider: 'firebase',
        searchProvider: 'firestore',
        analyticsProvider: 'google'
      },
      lastUpdated: new Date(),
      updatedBy: currentUser?.uid || 'system',
      version: '1.0.0'
    };
  }

  /**
   * Get default tags
   */
  private getDefaultTags(): TagSettings[] {
    return [
      // Topics
      { id: 'disclosure', name: 'Disclosure', color: '#3B82F6', icon: 'visibility', enabled: true, category: 'topics' },
      { id: 'assurance', name: 'Assurance', color: '#10B981', icon: 'verified', enabled: true, category: 'topics' },
      { id: 'procurement', name: 'Procurement', color: '#F59E0B', icon: 'shopping_cart', enabled: true, category: 'topics' },
      { id: 'monitoring', name: 'Monitoring', color: '#8B5CF6', icon: 'assessment', enabled: true, category: 'topics' },
      { id: 'stakeholder', name: 'Stakeholder Engagement', color: '#EC4899', icon: 'groups', enabled: true, category: 'topics' },
      { id: 'accountability', name: 'Accountability', color: '#14B8A6', icon: 'account_balance', enabled: true, category: 'topics' },
      
      // Regions
      { id: 'africa', name: 'Africa', color: '#F97316', icon: 'public', enabled: true, category: 'regions' },
      { id: 'asia', name: 'Asia', color: '#06B6D4', icon: 'public', enabled: true, category: 'regions' },
      { id: 'europe', name: 'Europe', color: '#6366F1', icon: 'public', enabled: true, category: 'regions' },
      { id: 'americas', name: 'Americas', color: '#84CC16', icon: 'public', enabled: true, category: 'regions' },
      
      // Types
      { id: 'best-practice', name: 'Best Practice', color: '#059669', icon: 'star', enabled: true, category: 'content-type' },
      { id: 'research', name: 'Research', color: '#7C3AED', icon: 'science', enabled: true, category: 'content-type' },
      { id: 'technical', name: 'Technical', color: '#DC2626', icon: 'engineering', enabled: true, category: 'content-type' }
    ];
  }

  /**
   * Get default categories
   */
  private getDefaultCategories(): CategorySettings[] {
    return [
      { id: 'topics', name: 'Topics', description: 'CoST core topics and themes', order: 1, enabled: true },
      { id: 'regions', name: 'Regions', description: 'Geographic regions', order: 2, enabled: true },
      { id: 'content-type', name: 'Content Type', description: 'Type of content', order: 3, enabled: true }
    ];
  }

  /**
   * Get default file types
   */
  private getDefaultFileTypes(): FileTypeConfig[] {
    return [
      { extension: 'pdf', mimeType: 'application/pdf', maxSizeMB: 50, enabled: true },
      { extension: 'doc', mimeType: 'application/msword', maxSizeMB: 25, enabled: true },
      { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', maxSizeMB: 25, enabled: true },
      { extension: 'xls', mimeType: 'application/vnd.ms-excel', maxSizeMB: 25, enabled: true },
      { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', maxSizeMB: 25, enabled: true },
      { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', maxSizeMB: 50, enabled: true },
      { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', maxSizeMB: 50, enabled: true },
      { extension: 'jpg', mimeType: 'image/jpeg', maxSizeMB: 10, enabled: true },
      { extension: 'jpeg', mimeType: 'image/jpeg', maxSizeMB: 10, enabled: true },
      { extension: 'png', mimeType: 'image/png', maxSizeMB: 10, enabled: true },
      { extension: 'gif', mimeType: 'image/gif', maxSizeMB: 5, enabled: true },
      { extension: 'zip', mimeType: 'application/zip', maxSizeMB: 100, enabled: true },
      { extension: 'csv', mimeType: 'text/csv', maxSizeMB: 10, enabled: true }
    ];
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    const now = new Date();
    return `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Generate checksum for settings data
   */
  private generateChecksum(settings: SettingsData): string {
    const settingsString = JSON.stringify(settings, null, 0);
    // Simple checksum - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < settingsString.length; i++) {
      const char = settingsString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Log settings changes for audit trail
   */
  private logSettingsChange(action: string, settings: SettingsData): void {
    const currentUser = this.authService.currentUser;
    
    this.activityService.trackActivity(
      'user_login' as any, // Using closest available type
      {
        // Use existing metadata properties that are available
        userAgent: navigator.userAgent,
        platform: this.getPlatformType()
      },
      undefined,
      `Settings ${action}`,
      currentUser
    ).catch((error: any) => {
      console.error('Failed to log settings activity:', error);
    });
  }

  private getPlatformType(): 'web' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|phone/i.test(userAgent)) return 'mobile';
    return 'web';
  }
}