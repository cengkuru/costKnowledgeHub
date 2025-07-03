// Settings models for CoST Knowledge Hub Admin Panel

export interface ApplicationSettings {
  siteTitle: string;
  siteDescription: string;
  defaultLanguage: 'en' | 'es' | 'pt';
  timezone: string;
  emailNotifications: boolean;
  analyticsEnabled: boolean;
  analyticsTrackingId?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface UserSecuritySettings {
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  twoFactorAuthEnabled: boolean;
  adminApprovalRequired: boolean;
}

export interface ContentManagementSettings {
  autoPublishResources: boolean;
  requireApprovalForPublishing: boolean;
  maxFileUploadSizeMB: number;
  allowedFileTypes: string[];
  autoGenerateThumbnails: boolean;
  enableContentVersioning: boolean;
  searchIndexingEnabled: boolean;
  autoTaggingEnabled: boolean;
  duplicateContentCheck: boolean;
}

export interface SystemAdministrationSettings {
  enableSystemLogs: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logRetentionDays: number;
  enablePerformanceMonitoring: boolean;
  enableAutoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetentionDays: number;
  enableCacheOptimization: boolean;
  cacheExpirationMinutes: number;
  enableRateLimiting: boolean;
  apiRateLimitPerMinute: number;
}

export interface IntegrationSettings {
  firebaseProjectId: string;
  emailServiceProvider: 'firebase' | 'sendgrid' | 'mailgun';
  emailServiceApiKey?: string;
  cdnEnabled: boolean;
  cdnEndpoint?: string;
  storageProvider: 'firebase' | 'aws' | 'gcp';
  searchProvider: 'firestore' | 'algolia' | 'elasticsearch';
  analyticsProvider: 'google' | 'mixpanel' | 'custom';
}

export interface SettingsData {
  application: ApplicationSettings;
  userSecurity: UserSecuritySettings;
  contentManagement: ContentManagementSettings;
  systemAdministration: SystemAdministrationSettings;
  integrations: IntegrationSettings;
  lastUpdated: Date;
  updatedBy: string;
  version: string;
}

export interface SettingsTab {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  hasChanges: boolean;
}

export interface SettingsValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SettingsExportData {
  settings: SettingsData;
  exportedAt: Date;
  exportedBy: string;
  version: string;
  checksum: string;
}