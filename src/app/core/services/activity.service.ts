import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Activity, ActivityType, ActivityFilter, ActivityMetadata } from '../models/activity.model';
import { FirestoreService } from './firestore.service';
import { User } from '@angular/fire/auth';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private firestoreService = inject(FirestoreService);
  private notificationService = inject(NotificationService);
  
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  public activities$ = this.activitiesSubject.asObservable();
  
  private sessionId: string;
  
  constructor() {
    // Generate a unique session ID for anonymous tracking
    this.sessionId = this.generateSessionId();
    
    // Store session ID in sessionStorage for consistency within a session
    const storedSessionId = sessionStorage.getItem('activitySessionId');
    if (storedSessionId) {
      this.sessionId = storedSessionId;
    } else {
      sessionStorage.setItem('activitySessionId', this.sessionId);
    }
  }
  
  /**
   * Track a user activity
   */
  async trackActivity(
    type: ActivityType,
    metadata?: ActivityMetadata,
    resourceId?: string,
    resourceTitle?: string,
    currentUser?: User | null
  ): Promise<void> {
    try {
      const activity: Omit<Activity, 'id'> = {
        type,
        timestamp: new Date(),
        sessionId: this.sessionId,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          platform: this.detectPlatform(),
          referrer: document.referrer || undefined
        }
      };
      
      // Add user information if authenticated
      if (currentUser) {
        activity.userId = currentUser.uid;
        activity.userEmail = currentUser.email || undefined;
        // TODO: Add user role when role management is implemented
      }
      
      // Add resource information if provided
      if (resourceId) {
        activity.resourceId = resourceId;
        activity.resourceTitle = resourceTitle;
      }
      
      // Log to Firestore
      await this.firestoreService.createActivity(activity);
      
      // Log to console in development
      if (!environment.production) {
        console.log('Activity tracked:', activity);
      }
      
      // Create notification for relevant activities
      if (this.shouldCreateNotification(type)) {
        await this.notificationService.createFromActivity({
          action: type,
          userId: currentUser?.uid || 'anonymous',
          resourceId,
          description: this.getActivityDescription(type, resourceTitle),
          metadata: {
            ...metadata,
            resourceTitle,
            userName: currentUser?.displayName || currentUser?.email?.split('@')[0],
            userEmail: currentUser?.email
          }
        });
      }
    } catch (error) {
      console.error('Error tracking activity:', error);
      // Don't throw - we don't want tracking errors to affect user experience
    }
  }
  
  /**
   * Determine if an activity should create a notification
   */
  private shouldCreateNotification(type: ActivityType): boolean {
    const notifiableTypes: ActivityType[] = [
      'resource_add',
      'resource_update',
      'resource_publish',
      'resource_unpublish',
      'resource_delete',
      'user_login',
      'user_logout'
    ];
    
    return notifiableTypes.includes(type);
  }
  
  /**
   * Get human-readable description for activity
   */
  private getActivityDescription(type: ActivityType, resourceTitle?: string): string {
    const descriptions: Partial<Record<ActivityType, string>> = {
      'resource_view': `Viewed resource: ${resourceTitle}`,
      'resource_download': `Downloaded resource: ${resourceTitle}`,
      'resource_search': 'Performed a search',
      'resource_filter': 'Applied filters',
      'resource_add': `Created new resource: ${resourceTitle}`,
      'resource_update': `Updated resource: ${resourceTitle}`,
      'resource_publish': `Published resource: ${resourceTitle}`,
      'resource_unpublish': `Unpublished resource: ${resourceTitle}`,
      'resource_delete': `Deleted resource: ${resourceTitle}`,
      'user_login': 'User logged in',
      'user_logout': 'User logged out',
      'user_register': 'New user registered',
      'user_signup': 'New user signed up'
    };
    
    return descriptions[type] || `Activity: ${type}`;
  }
  
  /**
   * Track resource view
   */
  async trackResourceView(resourceId: string, resourceTitle: string, currentUser?: User | null): Promise<void> {
    await this.trackActivity('resource_view', {}, resourceId, resourceTitle, currentUser);
  }
  
  /**
   * Track resource download
   */
  async trackResourceDownload(resourceId: string, resourceTitle: string, format?: string, currentUser?: User | null): Promise<void> {
    await this.trackActivity('resource_download', { downloadFormat: format }, resourceId, resourceTitle, currentUser);
  }
  
  /**
   * Track search activity
   */
  async trackSearch(query: string, resultsCount: number, currentUser?: User | null): Promise<void> {
    await this.trackActivity('resource_search', { searchQuery: query, resultsCount }, undefined, undefined, currentUser);
  }
  
  /**
   * Track filter changes
   */
  async trackFilterChange(filters: any, currentUser?: User | null): Promise<void> {
    await this.trackActivity('resource_filter', { filters }, undefined, undefined, currentUser);
  }
  
  /**
   * Track user login
   */
  async trackLogin(userEmail: string, currentUser?: User | null): Promise<void> {
    await this.trackActivity('user_login', {}, undefined, undefined, currentUser);
  }
  
  /**
   * Track user logout
   */
  async trackLogout(currentUser?: User | null): Promise<void> {
    await this.trackActivity('user_logout', {}, undefined, undefined, currentUser);
  }
  
  /**
   * Track resource management activities
   */
  async trackResourceManagement(
    type: 'resource_add' | 'resource_update' | 'resource_publish' | 'resource_unpublish' | 'resource_delete',
    resourceId: string,
    resourceTitle: string,
    metadata?: ActivityMetadata,
    currentUser?: User | null
  ): Promise<void> {
    await this.trackActivity(type, metadata, resourceId, resourceTitle, currentUser);
  }
  
  /**
   * Get recent activities
   */
  async getRecentActivities(filter?: ActivityFilter): Promise<Activity[]> {
    try {
      return await this.firestoreService.getActivities(filter);
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }
  
  /**
   * Get activities for admin dashboard
   */
  getAdminActivities(limit: number = 20): Observable<Activity[]> {
    return from(this.firestoreService.getActivities({ limit })).pipe(
      map(activities => activities.sort((a, b) => {
        // Handle null timestamps
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1; // Put items without timestamp at the end
        if (!b.timestamp) return -1;
        
        // Convert timestamps to Date objects
        const dateA = a.timestamp instanceof Date 
          ? a.timestamp 
          : (a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(0));
        const dateB = b.timestamp instanceof Date 
          ? b.timestamp 
          : (b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(0));
        
        return dateB.getTime() - dateA.getTime();
      })),
      catchError(error => {
        console.error('Error loading admin activities:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Detect user platform
   */
  private detectPlatform(): 'web' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod/.test(userAgent)) {
      return 'mobile';
    } else if (/ipad|tablet/.test(userAgent)) {
      return 'tablet';
    }
    
    return 'web';
  }
}

