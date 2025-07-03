import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  UserCredential,
  updateProfile
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

  private authStateReady = new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      unsubscribe();
      resolve();
    });
  });

  constructor() {
    // Continue listening to auth state changes after initial load
    this.authStateReady.then(() => {
      onAuthStateChanged(this.auth, (user) => {
        this.currentUserSubject.next(user);
      });
    });
  }

  /**
   * Wait for auth state to be ready
   */
  async waitForAuthState(): Promise<void> {
    return this.authStateReady;
  }

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @param rememberMe Whether to persist session
   */
  async signIn(email: string, password: string, rememberMe: boolean = false): Promise<UserCredential> {
    try {
      // For AngularFire, persistence is handled differently
      // The Auth instance automatically persists the session
      // We'll handle "remember me" through the auth state persistence

      // Debug logging
      console.log('=== AUTH DEBUG ===');
      console.log('Attempting to sign in with:');
      console.log('Email:', email);
      console.log('Email length:', email.length);
      console.log('Email trimmed:', email.trim());
      console.log('Email trimmed length:', email.trim().length);
      console.log('Password length:', password.length);
      console.log('Password (first 3 chars):', password.substring(0, 3) + '...');
      console.log('Firebase Config:', {
        apiKey: this.auth.app.options.apiKey?.substring(0, 10) + '...',
        authDomain: this.auth.app.options.authDomain,
        projectId: this.auth.app.options.projectId
      });
      console.log('Auth instance:', this.auth);
      console.log('Auth current user before sign in:', this.auth.currentUser);
      console.log('=================');

      // Ensure we're using trimmed email
      const trimmedEmail = email.trim();
      console.log('Final email being sent:', trimmedEmail);
      console.log('Email charCodes:', Array.from(trimmedEmail).map(c => c.charCodeAt(0)));

      const credential = await signInWithEmailAndPassword(this.auth, trimmedEmail, password);

      console.log('Sign in successful:', credential.user.email);

      // Don't navigate here - let the LoginComponent handle navigation
      // This allows proper handling of returnUrl

      return credential;
    } catch (error: any) {
      console.error('=== SIGN IN ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('====================');
      throw error;
    }
  }

  /**
   * Create a new user account
   * @param email User email
   * @param password User password
   */
  async signUp(email: string, password: string): Promise<UserCredential> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Navigate to admin dashboard on successful signup
      await this.router.navigate(['/admin']);

      return credential;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param email User email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  /**
   * Get user email
   */
  get userEmail(): string | null {
    return this.auth.currentUser?.email || null;
  }

  /**
   * Get user ID
   */
  get userId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Get user display name
   */
  get displayName(): string | null {
    return this.auth.currentUser?.displayName || null;
  }

  /**
   * Check if user has completed profile setup
   */
  hasCompletedProfile(): boolean {
    return !!this.auth.currentUser?.displayName;
  }

  /**
   * Update user profile (display name, photo URL)
   */
  async updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      await updateProfile(user, {
        displayName,
        photoURL: photoURL || user.photoURL
      });

      // Update the local user subject to reflect changes
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}
