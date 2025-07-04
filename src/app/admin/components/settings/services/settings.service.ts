import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
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
  SettingsValidationError
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
    this.loadSettings();
  }

  /**
   * Load current settings from Firestore
   */
  loadSettings(): Observable<SettingsData> {
    this.loadingSubject.next(true);
    
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
          this.saveSettings(defaultSettings).subscribe();
          return defaultSettings;
        }
      }),
      catchError(error => {
        console.error('Error loading settings:', error);
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
    const updatedSettings: SettingsData = {
      ...settings,
      lastUpdated: new Date(),
      updatedBy: currentUser?.uid || 'system',
      version: this.generateVersion()
    };

    const docRef = doc(this.firestore, this.SETTINGS_COLLECTION, this.SETTINGS_DOC_ID);
    
    return from(setDoc(docRef, updatedSettings)).pipe(
      tap(() => {
        this.settingsSubject.next(updatedSettings);
        this.logSettingsChange('settings_updated', updatedSettings);
      }),
      catchError(error => {
        console.error('Error saving settings:', error);
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
    if (settings.contentManagement.maxFileUploadSizeMB > 100) {
      errors.push({
        field: 'contentManagement.maxFileUploadSizeMB',
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
        autoPublishResources: false,
        requireApprovalForPublishing: true,
        maxFileUploadSizeMB: 25,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png', 'gif'],
        autoGenerateThumbnails: true,
        enableContentVersioning: true,
        searchIndexingEnabled: true,
        autoTaggingEnabled: false,
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