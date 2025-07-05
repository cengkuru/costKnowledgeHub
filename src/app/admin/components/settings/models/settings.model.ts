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

// Resource Type Configuration
export interface ResourceTypeSettings {
  id: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  order: number;
  defaultCover?: string;
  metadata?: {
    fields: ResourceTypeField[];
    workflow?: WorkflowStep[];
  };
}

export interface ResourceTypeField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'url' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  required: boolean;
}

// Tag and Category Management
export interface TagManagementSettings {
  tags: TagSettings[];
  categories: CategorySettings[];
  enableAutoTagging: boolean;
  maxTagsPerResource: number;
}

export interface TagSettings {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  enabled: boolean;
  category?: string;
}

export interface CategorySettings {
  id: string;
  name: string;
  description?: string;
  order: number;
  enabled: boolean;
}

// Language and Localization
export interface LanguageSettings {
  supportedLanguages: LanguageConfig[];
  defaultLanguage: string;
  autoTranslate: boolean;
  translationProvider?: 'google' | 'deepl' | 'azure';
}

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
}

// Publishing Workflow
export interface PublishingWorkflowSettings {
  workflows: WorkflowConfig[];
  defaultWorkflow: string;
  requireApproval: boolean;
  approvalLevels: number;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  steps: WorkflowStep[];
  resourceTypes: string[];
  enabled: boolean;
}

// Media and File Management
export interface MediaSettings {
  maxFileUploadSizeMB: number;
  allowedFileTypes: FileTypeConfig[];
  autoGenerateThumbnails: boolean;
  thumbnailSizes: ThumbnailSize[];
  imageOptimization: boolean;
  storageQuotaGB?: number;
  cdnEnabled: boolean;
}

export interface FileTypeConfig {
  extension: string;
  mimeType: string;
  maxSizeMB?: number;
  enabled: boolean;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  crop: boolean;
}

// AI Content Generation
export interface AIContentSettings {
  enableAISummaries: boolean;
  enableAITags: boolean;
  enableAIImageSuggestions: boolean;
  aiProvider: 'gemini' | 'openai' | 'anthropic';
  apiKey?: string;
  maxRequestsPerDay?: number;
  defaultPrompts: {
    summaryPrompt?: string;
    tagPrompt?: string;
  };
}

// Search and Discovery
export interface SearchSettings {
  searchProvider: 'firestore' | 'algolia' | 'elasticsearch';
  searchWeights: {
    title: number;
    description: number;
    content: number;
    tags: number;
  };
  enableSynonyms: boolean;
  synonymDictionary?: SynonymEntry[];
  enableFeaturedResults: boolean;
  autocompleteSuggestions: number;
}

export interface SynonymEntry {
  term: string;
  synonyms: string[];
}

// Homepage and Featured Content
export interface HomepageSettings {
  heroContent: {
    title: string;
    subtitle: string;
    backgroundImage?: string;
    ctaText?: string;
    ctaLink?: string;
  };
  featuredResources: string[];
  topicHighlights: string[];
  showStatistics: boolean;
  customBlocks: ContentBlock[];
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'resources' | 'custom';
  title?: string;
  content?: any;
  order: number;
  enabled: boolean;
}

// Analytics and Metrics
export interface AnalyticsSettings {
  enableAnalytics: boolean;
  trackingId?: string;
  customMetrics: MetricConfig[];
  reportingPeriods: string[];
  exportFormats: string[];
  dashboardWidgets: string[];
}

export interface MetricConfig {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  enabled: boolean;
}

// Enhanced Content Management Settings
export interface ContentManagementSettings {
  // Resource Management
  resourceTypes: ResourceTypeSettings[];
  defaultResourceType: string;
  
  // Tag Management
  tagManagement: TagManagementSettings;
  
  // Publishing
  autoPublishResources: boolean;
  requireApprovalForPublishing: boolean;
  publishingWorkflow: PublishingWorkflowSettings;
  
  // Media
  mediaSettings: MediaSettings;
  
  // AI Features
  aiSettings: AIContentSettings;
  
  // Search
  searchSettings: SearchSettings;
  
  // Homepage
  homepageSettings: HomepageSettings;
  
  // Analytics
  analyticsSettings: AnalyticsSettings;
  
  // Languages
  languageSettings: LanguageSettings;
  
  // Legacy fields (for backward compatibility)
  enableContentVersioning: boolean;
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