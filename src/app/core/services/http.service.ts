import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Enhanced HTTP service for secure communication with Firebase Cloud Functions
 * Automatically handles authentication headers and CORS
 */
@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  
  private readonly baseUrl = `https://us-central1-${environment.firebaseConfig.projectId}.cloudfunctions.net`;
  
  /**
   * Get current user's Firebase ID token
   * This is required for all authenticated Cloud Function calls
   */
  private async getAuthHeaders(): Promise<HttpHeaders> {
    const user = this.auth.currentUser;
    
    if (!user) {
      console.error('HttpService: No authenticated user found');
      throw new Error('User not authenticated. Please log in.');
    }
    
    try {
      console.log('HttpService: Getting ID token for user:', user.email);
      
      // Force refresh token to ensure we have the latest claims
      const idToken = await user.getIdToken(true);
      
      // Get token result to check claims
      const tokenResult = await user.getIdTokenResult();
      console.log('HttpService: Token claims:', tokenResult.claims);
      
      if (!tokenResult.claims['admin']) {
        console.warn('HttpService: User does not have admin privileges');
        console.warn('HttpService: If you need admin access, contact an administrator');
      }
      
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'X-Requested-With': 'XMLHttpRequest'
      });
    } catch (error) {
      console.error('HttpService: Failed to get auth headers:', error);
      throw new Error('Failed to get authentication token. Please try signing out and back in.');
    }
  }
  
  /**
   * Make authenticated POST request to Cloud Function
   * @param functionName Name of the Cloud Function
   * @param data Request payload
   * @param retryCount Number of retry attempts on failure
   */
  postFunction<T>(functionName: string, data: any = {}, retryCount: number = 2): Observable<T> {
    const url = `${this.baseUrl}/${functionName}`;
    
    console.log(`HttpService: Making POST request to ${functionName}`);
    console.log(`HttpService: Request data:`, data);
    
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => {
        console.log(`HttpService: Request headers:`, headers);
        
        return this.http.post<T>(url, data, { headers }).pipe(
          retry(retryCount),
          catchError((error: HttpErrorResponse) => this.handleHttpError(error, functionName))
        );
      }),
      catchError((error) => this.handleAuthError(error, functionName))
    );
  }
  
  /**
   * Make authenticated GET request to Cloud Function
   * @param functionName Name of the Cloud Function
   * @param retryCount Number of retry attempts on failure
   */
  getFunction<T>(functionName: string, retryCount: number = 2): Observable<T> {
    const url = `${this.baseUrl}/${functionName}`;
    
    console.log(`HttpService: Making GET request to ${functionName}`);
    
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => {
        return this.http.get<T>(url, { headers }).pipe(
          retry(retryCount),
          catchError((error: HttpErrorResponse) => this.handleHttpError(error, functionName))
        );
      }),
      catchError((error) => this.handleAuthError(error, functionName))
    );
  }
  
  /**
   * Handle HTTP errors with detailed logging
   */
  private handleHttpError(error: HttpErrorResponse, functionName: string): Observable<never> {
    console.error(`HttpService: HTTP error in ${functionName}:`, error);
    
    let errorMessage = 'An error occurred';
    let userMessage = 'Something went wrong. Please try again.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
      userMessage = 'Network error. Please check your connection.';
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Authentication failed';
          userMessage = 'Your session has expired. Please log in again.';
          break;
        case 403:
          errorMessage = 'Access denied';
          userMessage = 'You do not have permission to perform this action. Contact an administrator if you believe this is an error.';
          break;
        case 404:
          errorMessage = 'Function not found';
          userMessage = 'The requested service is not available.';
          break;
        case 500:
          errorMessage = 'Internal server error';
          userMessage = 'Server error. Please try again in a few minutes.';
          break;
        default:
          errorMessage = `HTTP ${error.status}: ${error.message}`;
          userMessage = 'An unexpected error occurred. Please try again.';
      }
    }
    
    console.error(`HttpService: ${errorMessage}`);
    
    return throwError(() => ({
      originalError: error,
      errorMessage,
      userMessage,
      statusCode: error.status
    }));
  }
  
  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any, functionName: string): Observable<never> {
    console.error(`HttpService: Auth error in ${functionName}:`, error);
    
    let userMessage = 'Authentication error. Please log in again.';
    
    if (error.message?.includes('not authenticated')) {
      userMessage = 'Please log in to access this feature.';
    } else if (error.message?.includes('admin')) {
      userMessage = 'You need administrator privileges to perform this action.';
    }
    
    return throwError(() => ({
      originalError: error,
      errorMessage: error.message || 'Authentication failed',
      userMessage,
      statusCode: 401
    }));
  }
  
  /**
   * Check if user is authenticated and has admin privileges
   */
  async checkAdminAuth(): Promise<boolean> {
    const user = this.auth.currentUser;
    
    if (!user) {
      console.log('HttpService: No user authenticated');
      return false;
    }
    
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const isAdmin = tokenResult.claims['admin'] === true;
      
      console.log('HttpService: Admin check result:', {
        uid: user.uid,
        email: user.email,
        isAdmin,
        claims: tokenResult.claims
      });
      
      return isAdmin;
    } catch (error) {
      console.error('HttpService: Failed to check admin status:', error);
      return false;
    }
  }
  
  /**
   * Force refresh user token to get latest claims
   */
  async refreshUserToken(): Promise<void> {
    const user = this.auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    try {
      console.log('HttpService: Refreshing user token...');
      await user.getIdToken(true); // Force refresh
      console.log('HttpService: Token refreshed successfully');
    } catch (error) {
      console.error('HttpService: Failed to refresh token:', error);
      throw error;
    }
  }
}
