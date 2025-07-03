import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  getDocs,
  addDoc
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, from, map, switchMap, of } from 'rxjs';
import { Notification, NotificationType, NotificationPriority, NotificationStats } from '../models/notification.model';
import { I18nService } from './i18n.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);
  private i18nService = inject(I18nService);
  
  private notificationsCollection = collection(this.firestore, 'notifications');
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unsubscribe: Unsubscribe | null = null;
  private currentUserId: string | null = null;

  constructor() {
    // AuthService will call startListeningForUser when user changes
  }
  
  /**
   * Start listening for a specific user (called by AuthService)
   */
  public startListeningForUser(userId: string | null): void {
    this.currentUserId = userId;
    if (userId) {
      this.startListening(userId);
    } else {
      this.stopListening();
    }
  }

  /**
   * Start listening to user's notifications in real-time
   */
  private startListening(userId: string): void {
    this.stopListening(); // Clean up any existing listener
    
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to most recent 50 notifications
    );
    
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      let unreadCount = 0;
      
      snapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() } as Notification;
        notifications.push(notification);
        if (!notification.read) {
          unreadCount++;
        }
      });
      
      this.notificationsSubject.next(notifications);
      this.unreadCountSubject.next(unreadCount);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });
  }

  /**
   * Stop listening to notifications
   */
  private stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      metadata?: any;
      priority?: NotificationPriority;
      actionUrl?: string;
      expiresInDays?: number;
    }
  ): Promise<string> {
    const notification = {
      userId,
      type,
      title,
      message,
      metadata: options?.metadata || {},
      read: false,
      createdAt: serverTimestamp(),
      priority: options?.priority || 'medium',
      actionUrl: options?.actionUrl || null,
      expiresAt: options?.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000) 
        : null
    };
    
    const docRef = await addDoc(this.notificationsCollection, notification);
    return docRef.id;
  }

  /**
   * Create notification from activity
   */
  async createFromActivity(activity: any): Promise<void> {
    // Map activity types to notification types
    const notificationTypeMap: Record<string, NotificationType> = {
      'resource_add': 'resource_published',
      'resource_publish': 'resource_published',
      'resource_unpublish': 'resource_unpublished',
      'resource_update': 'resource_updated',
      'user_add': 'new_user_registration',
      'user_role_change': 'user_role_changed',
      'file_upload': 'file_upload_completed',
      'bulk_operation': 'bulk_operation_completed'
    };

    const notificationType = notificationTypeMap[activity.action];
    if (!notificationType) return; // Skip if no mapping exists

    // Determine target users based on activity type
    const targetUsers = await this.getTargetUsers(activity);
    
    // Create notifications for each target user
    const batch = writeBatch(this.firestore);
    
    for (const userId of targetUsers) {
      // Skip if user is the one who performed the action
      if (userId === activity.userId) continue;
      
      const { title, message, actionUrl } = this.formatNotificationContent(activity, notificationType);
      
      const notificationRef = doc(this.notificationsCollection);
      batch.set(notificationRef, {
        userId,
        type: notificationType,
        title,
        message,
        metadata: activity.metadata || {},
        read: false,
        createdAt: serverTimestamp(),
        priority: this.getNotificationPriority(notificationType),
        actionUrl
      });
    }
    
    await batch.commit();
  }

  /**
   * Get target users for a notification based on activity
   */
  private async getTargetUsers(activity: any): Promise<string[]> {
    const targetUsers: string[] = [];
    
    switch (activity.action) {
      case 'resource_add':
      case 'resource_publish':
      case 'resource_unpublish':
      case 'resource_update':
        // Notify all admin users
        const adminUsers = await this.getAdminUsers();
        targetUsers.push(...adminUsers);
        break;
        
      case 'user_add':
      case 'user_role_change':
        // Notify all admin users
        const admins = await this.getAdminUsers();
        targetUsers.push(...admins);
        break;
        
      default:
        // For other activities, notify the activity creator if different from performer
        if (activity.metadata?.ownerId && activity.metadata.ownerId !== activity.userId) {
          targetUsers.push(activity.metadata.ownerId);
        }
    }
    
    return [...new Set(targetUsers)]; // Remove duplicates
  }

  /**
   * Get all admin users
   */
  private async getAdminUsers(): Promise<string[]> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('role', '==', 'admin'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.id);
  }

  /**
   * Format notification content based on activity and type
   */
  private formatNotificationContent(
    activity: any, 
    type: NotificationType
  ): { title: string; message: string; actionUrl?: string } {
    const lang = this.i18nService.getCurrentLanguage();
    
    switch (type) {
      case 'resource_published':
        return {
          title: 'New Resource Published',
          message: `${activity.metadata?.resourceTitle || 'A resource'} has been published`,
          actionUrl: `/admin/resources/${activity.resourceId}/edit`
        };
        
      case 'resource_unpublished':
        return {
          title: 'Resource Unpublished',
          message: `${activity.metadata?.resourceTitle || 'A resource'} has been unpublished`,
          actionUrl: `/admin/resources/${activity.resourceId}/edit`
        };
        
      case 'resource_updated':
        return {
          title: 'Resource Updated',
          message: `${activity.metadata?.resourceTitle || 'A resource'} has been updated`,
          actionUrl: `/admin/resources/${activity.resourceId}/edit`
        };
        
      case 'new_user_registration':
        return {
          title: 'New User Registration',
          message: `${activity.metadata?.userName || 'A new user'} has registered`,
          actionUrl: '/admin/users'
        };
        
      case 'user_role_changed':
        return {
          title: 'User Role Changed',
          message: `${activity.metadata?.userName || 'A user'}'s role has been changed to ${activity.metadata?.newRole}`,
          actionUrl: '/admin/users'
        };
        
      case 'file_upload_completed':
        return {
          title: 'File Upload Completed',
          message: `${activity.metadata?.fileName || 'File'} has been uploaded successfully`,
          actionUrl: '/admin/file-upload'
        };
        
      default:
        return {
          title: 'System Notification',
          message: activity.description || 'An action has been performed'
        };
    }
  }

  /**
   * Get notification priority based on type
   */
  private getNotificationPriority(type: NotificationType): NotificationPriority {
    const priorityMap: Partial<Record<NotificationType, NotificationPriority>> = {
      'resource_approval_needed': 'high',
      'system_maintenance': 'high',
      'user_role_changed': 'high',
      'new_user_registration': 'medium',
      'resource_published': 'medium',
      'resource_unpublished': 'medium',
      'resource_updated': 'low',
      'file_upload_completed': 'low',
      'report_available': 'low'
    };
    
    return priorityMap[type] || 'medium';
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(this.notificationsCollection, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;
    
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(this.notificationsCollection, notificationId);
    await deleteDoc(notificationRef);
  }

  /**
   * Clear all notifications for current user
   */
  async clearAllNotifications(): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;
    
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    const userId = this.currentUserId;
    if (!userId) return { 
      total: 0, 
      unread: 0, 
      byType: {} as Record<NotificationType, number>, 
      byPriority: { low: 0, medium: 0, high: 0 } 
    };
    
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const stats: NotificationStats = {
      total: 0,
      unread: 0,
      byType: {} as any,
      byPriority: { low: 0, medium: 0, high: 0 }
    };
    
    snapshot.forEach((doc) => {
      const notification = doc.data() as Notification;
      stats.total++;
      
      if (!notification.read) {
        stats.unread++;
      }
      
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Count by priority
      stats.byPriority[notification.priority]++;
    });
    
    return stats;
  }

  /**
   * Clean up expired notifications (called by Cloud Function)
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const q = query(
      this.notificationsCollection,
      where('createdAt', '<', thirtyDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
  }
}