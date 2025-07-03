// Timestamp type - Firebase Timestamp or Date

export type ActivityType = 
  | 'resource_view'
  | 'resource_download'
  | 'resource_search'
  | 'resource_filter'
  | 'resource_add'
  | 'resource_update'
  | 'resource_publish'
  | 'resource_unpublish'
  | 'resource_delete'
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_signup';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: any; // Firebase Timestamp or Date
  userId?: string; // Optional - only for authenticated users
  userEmail?: string; // Optional - only for authenticated users
  userRole?: string; // Optional - admin, editor, viewer
  sessionId: string; // For anonymous user tracking
  resourceId?: string; // For resource-related activities
  resourceTitle?: string; // For resource-related activities
  metadata?: ActivityMetadata;
}

export interface ActivityMetadata {
  // For search activities
  searchQuery?: string;
  resultsCount?: number;
  
  // For filter activities
  filters?: {
    type?: string[];
    topic?: string[];
    language?: string[];
    country?: string[];
  };
  
  // For download activities
  downloadFormat?: string;
  
  // For resource management activities
  previousStatus?: string;
  newStatus?: string;
  changedFields?: string[];
  
  // For user signup activities
  autoCreated?: boolean; // Whether profile was auto-created by trigger
  signupMethod?: 'email' | 'google' | 'social';
  
  // General metadata
  userAgent?: string;
  ipCountry?: string; // Anonymized to country level only
  referrer?: string;
  platform?: 'web' | 'mobile' | 'tablet';
}

export interface ActivityStats {
  totalViews: number;
  totalDownloads: number;
  totalSearches: number;
  uniqueUsers: number;
  topResources: { resourceId: string; title: string; views: number }[];
  topSearchQueries: { query: string; count: number }[];
  activityByDay: { date: string; count: number }[];
}

export interface ActivityFilter {
  type?: ActivityType[];
  userId?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}