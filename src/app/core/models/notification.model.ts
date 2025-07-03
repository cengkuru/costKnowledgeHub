import { Timestamp } from './resource.model';

export type NotificationType = 
  | 'resource_published'
  | 'resource_unpublished'
  | 'resource_approval_needed'
  | 'new_user_registration'
  | 'user_role_changed'
  | 'system_maintenance'
  | 'report_available'
  | 'bulk_operation_completed'
  | 'resource_updated'
  | 'file_upload_completed'
  | 'import_completed';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  userId: string;                    // Target user ID
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;   // Context-specific data
  read: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
  expiresAt?: Timestamp;            // For auto-cleanup
  priority: NotificationPriority;
  actionUrl?: string;               // Deep link to relevant page
  icon?: string;                    // Icon identifier
}

export interface NotificationMetadata {
  resourceId?: string;
  resourceTitle?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  reportType?: string;
  operationType?: string;
  itemCount?: number;
  previousValue?: any;
  newValue?: any;
  [key: string]: any;  // Allow additional metadata
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  browserNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]?: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;  // HH:mm format
    endTime: string;    // HH:mm format
    timezone: string;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Helper to get notification icon based on type
export function getNotificationIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    resource_published: 'publish',
    resource_unpublished: 'unpublish',
    resource_approval_needed: 'approval',
    resource_updated: 'update',
    new_user_registration: 'person_add',
    user_role_changed: 'admin_panel_settings',
    system_maintenance: 'engineering',
    report_available: 'assessment',
    bulk_operation_completed: 'checklist',
    file_upload_completed: 'cloud_done',
    import_completed: 'import_export'
  };
  
  return iconMap[type] || 'notifications';
}

// Helper to get notification color based on type
export function getNotificationColor(type: NotificationType): 'info' | 'success' | 'warning' | 'error' {
  const colorMap: Partial<Record<NotificationType, 'info' | 'success' | 'warning' | 'error'>> = {
    resource_published: 'success',
    resource_unpublished: 'warning',
    resource_approval_needed: 'warning',
    resource_updated: 'info',
    new_user_registration: 'info',
    user_role_changed: 'warning',
    system_maintenance: 'warning',
    report_available: 'info',
    bulk_operation_completed: 'success',
    file_upload_completed: 'success',
    import_completed: 'success'
  };
  
  return colorMap[type] || 'info';
}

// Helper to format notification time
export function formatNotificationTime(timestamp: Timestamp): string {
  const now = Date.now();
  const notificationTime = timestamp.seconds * 1000;
  const diffMs = now - notificationTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // Return formatted date for older notifications
  return new Date(notificationTime).toLocaleDateString();
}