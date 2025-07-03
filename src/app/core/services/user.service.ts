import { Injectable, inject } from '@angular/core';
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

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const users: User[] = [];
      snapshot.forEach((doc: any) => {
        users.push({ uid: doc.id, ...doc.data() } as User);
      });

      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
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
   * Create a new user
   */
  async createUser(
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer'
  ): Promise<User> {
    try {
      // Create auth user
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
      console.error('Error creating user:', error);
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
      const activity: UserActivity = {
        userId,
        action,
        resourceId,
        timestamp: serverTimestamp() as any,
        metadata
      };

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
}
