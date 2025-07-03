import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Activity, ActivityType, ActivityFilter, ActivityMetadata } from '../models/activity.model';
import { FirestoreService } from './firestore.service';
import { User } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private firestoreService = inject(FirestoreService);
  
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
    } catch (error) {
      console.error('Error tracking activity:', error);
      // Don't throw - we don't want tracking errors to affect user experience
    }
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
        const dateA = a.timestamp instanceof Date ? a.timestamp : a.timestamp.toDate();
        const dateB = b.timestamp instanceof Date ? b.timestamp : b.timestamp.toDate();
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

// Import environment configuration
import { environment } from '../../../environments/environment';