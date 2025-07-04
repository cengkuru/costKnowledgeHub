import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from '@angular/fire/firestore';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser as deleteAuthUser,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService } from './auth.service';
import { HttpService } from './http.service';
import { Observable, from, BehaviorSubject, firstValueFrom } from 'rxjs';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  metadata?: {
    department?: string;
    position?: string;
    phone?: string;
    location?: string;
  };
}

/**
 * Extended user interface that includes Firebase Auth data and sync status
 */
export interface ExtendedUser extends User {
  emailVerified?: boolean;
  disabled?: boolean;
  authMetadata?: {
    creationTime: string;
    lastSignInTime?: string;
    lastRefreshTime?: string;
  };
  customClaims?: any;
  syncStatus?: {
    syncedToFirestore: boolean;
    lastSyncedAt?: Date;
  };
}

/**
 * Migration status interface
 */
export interface MigrationStatus {
  authUserCount: number;
  firestoreUserCount: number;
  syncedCount: number;
  unsyncedCount: number;
  syncRate: number;
  needsMigration: boolean;
}

export interface UserActivity {
  userId: string;
  action: string;
  resourceId?: string;
  timestamp: Date;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private functions = inject(Functions);
  private authService = inject(AuthService);
  private httpService = inject(HttpService);

  // Cache for user data to avoid excessive Cloud Function calls
  private userCache = new BehaviorSubject<ExtendedUser[]>([]);
  private migrationStatusCache = new BehaviorSubject<MigrationStatus | null>(null);
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Make authenticated HTTP request to Cloud Function using HttpService
   * This automatically handles authentication headers and error handling
   */
  private async callCloudFunction<T>(functionName: string, data?: any): Promise<T> {
    try {
      console.log(`UserService: Calling ${functionName} with data:`, data);

      const response = await firstValueFrom(
        this.httpService.postFunction<{success: boolean, data: T, error?: string}>(functionName, data)
      );

      if (response.success) {
        console.log(`UserService: ${functionName} response:`, response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Cloud function call failed');
      }
    } catch (error: any) {
      console.error(`UserService: Error calling ${functionName}:`, error);

      // Re-throw with user-friendly message if available
      if (error.userMessage) {
        throw new Error(error.userMessage);
      }

      throw error;
    }
  }

    /**
   * Get all users (Firestore only - legacy method)
   */
  async getUsers(): Promise<User[]> {
    try {
      const usersCollection = collection(this.firestore, 'users');
      // Remove ordering to avoid issues with missing fields
      const snapshot = await getDocs(usersCollection);

      const users: User[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          ...data,
          // Ensure we have a createdAt field for the interface
          createdAt: data.createdAt || data.updatedAt || new Date()
        } as User);
      });

      console.log('Retrieved users from Firestore:', users);
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get all Firebase Auth users with sync status (primary method)
   * Combines Firebase Auth data with Firestore metadata
   */
  async getAllAuthUsers(forceRefresh = false): Promise<ExtendedUser[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (!forceRefresh && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
        const cached = this.userCache.getValue();
        if (cached.length > 0) {
          return cached;
        }
      }

      // Call Cloud Function to get Auth users
      const result = await this.callCloudFunction<{ users: any[], pageToken?: string, totalCount: number }>(
        'listAllAuthUsers',
        { maxResults: 1000 }
      );

      const { users } = result;

      // Transform to ExtendedUser format
      const extendedUsers: ExtendedUser[] = users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: this.getUserRoleFromClaims(user.customClaims),
        status: user.disabled ? 'suspended' : 'active',
        createdAt: new Date(user.metadata.creationTime),
        lastLoginAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : undefined,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        authMetadata: user.metadata,
        customClaims: user.customClaims,
        syncStatus: user.syncStatus
      }));

      // Update cache
      this.userCache.next(extendedUsers);
      this.lastCacheUpdate = now;

      return extendedUsers;
    } catch (error) {
      console.error('Error getting Auth users:', error);
      // Fallback to Firestore users if Cloud Function fails
      const firestoreUsers = await this.getUsers();
      return firestoreUsers.map(user => ({
        ...user,
        syncStatus: { syncedToFirestore: true }
      }));
    }
  }

  /**
   * Get migration status showing Auth vs Firestore user counts
   */
  async getMigrationStatus(forceRefresh = false): Promise<MigrationStatus> {
    try {
      // Check cache first
      const now = Date.now();
      if (!forceRefresh && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
        const cached = this.migrationStatusCache.getValue();
        if (cached) {
          return cached;
        }
      }

      const status = await this.callCloudFunction<MigrationStatus>('getMigrationStatus');

      // Update cache
      this.migrationStatusCache.next(status);

      return status;
    } catch (error) {
      console.error('Error getting migration status:', error);

      // Fallback: count Firestore users only
      const firestoreUsers = await this.getUsers();
      return {
        authUserCount: 0, // Unknown without Admin SDK
        firestoreUserCount: firestoreUsers.length,
        syncedCount: firestoreUsers.length,
        unsyncedCount: 0,
        syncRate: 0,
        needsMigration: false
      };
    }
  }

  /**
   * Sync a specific user from Firebase Auth to Firestore
   */
  async syncUserToFirestore(uid: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.callCloudFunction<{
        uid: string;
        email: string;
        wasExisting: boolean;
        syncedAt: any;
      }>('syncAuthUserToFirestore', { uid });

      // Clear cache to force refresh on next request
      this.clearCache();

      return {
        success: true,
        message: `User ${uid} synced successfully`
      };
    } catch (error) {
      console.error('Error syncing user:', error);
      return {
        success: false,
        message: 'Failed to sync user'
      };
    }
  }

  /**
   * Migrate all Firebase Auth users to Firestore in batches
   */
  async migrateAllUsers(batchSize = 100): Promise<{
    success: boolean;
    totalProcessed: number;
    totalSuccessful: number;
    totalErrors: number;
    hasMoreUsers: boolean;
  }> {
    try {
      const result = await this.callCloudFunction<{
        totalProcessed: number;
        totalSuccessful: number;
        totalErrors: number;
        errors: any[];
        hasMoreUsers: boolean;
        nextPageToken?: string;
      }>('migrateAllUsers', { batchSize });

      // Clear cache to force refresh on next request
      this.clearCache();

      return {
        success: true,
        totalProcessed: result.totalProcessed,
        totalSuccessful: result.totalSuccessful,
        totalErrors: result.totalErrors,
        hasMoreUsers: result.hasMoreUsers
      };
    } catch (error) {
      console.error('Error migrating users:', error);
      return {
        success: false,
        totalProcessed: 0,
        totalSuccessful: 0,
        totalErrors: 1,
        hasMoreUsers: false
      };
    }
  }

  /**
   * Clear user cache to force fresh data on next request
   */
  clearCache(): void {
    this.userCache.next([]);
    this.migrationStatusCache.next(null);
    this.lastCacheUpdate = 0;
  }

  /**
   * Get user role from Firebase custom claims
   */
  private getUserRoleFromClaims(customClaims?: any): 'admin' | 'editor' | 'viewer' {
    if (customClaims?.admin) return 'admin';
    if (customClaims?.editor) return 'editor';
    return 'viewer';
  }

  /**
   * Get user by ID
   */
  async getUserById(uid: string): Promise<User | null> {
    try {
      const userDoc = doc(this.firestore, 'users', uid);
      const snapshot = await getDoc(userDoc);

      if (snapshot.exists()) {
        return { uid: snapshot.id, ...snapshot.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Create a new user using Cloud Function (Admin SDK)
   * This method preserves the current admin's authentication state
   */
  async createUser(
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer'
  ): Promise<User> {
    try {
      console.log('UserService: Creating user via Cloud Function with data:', {
        email,
        displayName,
        role,
        passwordLength: password.length
      });

      // Call the Cloud Function using our standardized method
      const result = await this.callCloudFunction<{
        user: User;
        message: string;
      }>('createAdminUser', {
        email,
        password,
        displayName,
        role
      });

      console.log('UserService: User created successfully via Cloud Function:', result.user);

      // Clear cache to ensure fresh data on next request
      this.clearCache();

      return result.user;
    } catch (error: any) {
      console.error('UserService: Error creating user via Cloud Function:', error);
      
      // Extract user-friendly error messages from Cloud Function errors
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to create user. Please try again.');
    }
  }

  /**
   * Legacy method: Create a new user using client-side Firebase Auth
   * ⚠️ WARNING: This method logs in the newly created user, overriding current session
   * Use createUser() instead which calls the Cloud Function
   * @deprecated Use createUser() method instead
   */
  async createUserLegacy(
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer'
  ): Promise<User> {
    try {
      console.warn('⚠️ Using legacy createUserLegacy method - this will log in the new user!');
      
      // Create auth user (THIS LOGS IN THE NEW USER!)
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const { user } = userCredential;

      // Update display name
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      const userData: Omit<User, 'uid'> = {
        email,
        displayName,
        role,
        status: 'active',
        createdAt: serverTimestamp() as any,
        lastLoginAt: serverTimestamp() as any
      };

      await setDoc(doc(this.firestore, 'users', user.uid), userData);

      return { uid: user.uid, ...userData };
    } catch (error) {
      console.error('Error creating user with legacy method:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const userDoc = doc(this.firestore, 'users', uid);

      // Don't allow updating uid
      const { uid: _, ...updateData } = updates;

      await updateDoc(userDoc, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      // If display name changed, update auth profile
      if (updates.displayName) {
        // This would require admin SDK or a cloud function
        // For now, we'll just update Firestore
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(uid: string, role: 'admin' | 'editor' | 'viewer'): Promise<void> {
    try {
      await this.updateUser(uid, { role });

      // In production, you might want to use a Cloud Function to set custom claims
      // const setUserRole = httpsCallable(this.functions, 'setUserRole');
      // await setUserRole({ uid, role });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(uid: string, status: 'active' | 'suspended' | 'pending'): Promise<void> {
    try {
      await this.updateUser(uid, { status });

      // In production, you might want to disable/enable the auth account
      // This requires Admin SDK or Cloud Functions
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      // Delete user document
      await deleteDoc(doc(this.firestore, 'users', uid));

      // Deleting auth user requires Admin SDK or the user to be currently signed in
      // In production, use a Cloud Function for this
      // const deleteAuthUser = httpsCallable(this.functions, 'deleteUser');
      // await deleteAuthUser({ uid });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, limitCount: number = 50): Promise<UserActivity[]> {
    try {
      const activityCollection = collection(this.firestore, 'user_activity');
      const q = query(
        activityCollection,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
            const activities: UserActivity[] = [];

      snapshot.forEach((doc: any) => {
        activities.push(doc.data() as UserActivity);
      });

      return activities;
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  /**
   * Log user activity
   */
  async logActivity(userId: string, action: string, resourceId?: string, metadata?: any): Promise<void> {
    try {
      const activity: any = {
        userId,
        action,
        timestamp: serverTimestamp()
      };

      // Only include resourceId if it's provided
      if (resourceId !== undefined) {
        activity.resourceId = resourceId;
      }

      // Only include metadata if it's provided
      if (metadata !== undefined) {
        activity.metadata = metadata;
      }

      await setDoc(doc(collection(this.firestore, 'user_activity')), activity);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      // Firestore doesn't support full-text search, so we'll do client-side filtering
      const allUsers = await this.getUsers();
      const term = searchTerm.toLowerCase();

      return allUsers.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term) ||
        user.metadata?.department?.toLowerCase().includes(term) ||
        user.metadata?.position?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Set admin claim for a user
   */
  setAdminClaim(email: string, makeAdmin: boolean): Observable<any> {
    const setAdminClaimFn = httpsCallable(this.functions, 'setAdminClaim');
    return from(setAdminClaimFn({ email, makeAdmin }));
  }

  /**
   * Send admin role notification email
   */
  sendAdminRoleEmail(email: string, userName: string, isAdmin: boolean): Observable<any> {
    const sendAdminRoleEmailFn = httpsCallable(this.functions, 'sendAdminRoleEmail');
    return from(sendAdminRoleEmailFn({
      email,
      userName,
      isAdmin,
      adminUrl: `${window.location.origin}/admin`,
      platformUrl: window.location.origin
    }));
  }

  /**
   * Send resource notification email
   */
  sendResourceNotificationEmail(data: {
    email: string;
    userName: string;
    resourceTitle: string;
    resourceType: string;
    resourceStatus: string;
    submissionDate: string;
    resourceUrl?: string;
    editUrl?: string;
    feedback?: string;
    notificationType: 'resource_submitted' | 'resource_approved' | 'resource_rejected';
  }): Observable<any> {
    const sendResourceNotificationFn = httpsCallable(this.functions, 'sendResourceNotificationEmail');
    return from(sendResourceNotificationFn(data));
  }

  /**
   * Send AI processing completion email
   */
  sendAIProcessingEmail(data: {
    email: string;
    userName: string;
    resourceTitle: string;
    languageCount?: number;
    tagCount?: number;
    resourceUrl?: string;
  }): Observable<any> {
    const sendAIProcessingFn = httpsCallable(this.functions, 'sendAIProcessingEmail');
    return from(sendAIProcessingFn(data));
  }

  /**
   * Send bulk operation completion email
   */
  sendBulkOperationEmail(data: {
    adminEmails: string[];
    operationType: string;
    operationSummary: string;
    affectedCount: number;
    completedAt: string;
    operationDetails?: any;
  }): Observable<any> {
    const sendBulkOperationFn = httpsCallable(this.functions, 'sendBulkOperationEmail');
    return from(sendBulkOperationFn(data));
  }

  /**
   * Send system error notification email
   */
  sendSystemErrorEmail(data: {
    error: any;
    component: string;
    adminEmails: string[];
  }): Observable<any> {
    const sendSystemErrorFn = httpsCallable(this.functions, 'sendSystemErrorEmail');
    return from(sendSystemErrorFn(data));
  }
}
