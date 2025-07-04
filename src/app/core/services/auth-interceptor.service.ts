import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * Global HTTP interceptor that automatically adds authentication headers
 * and handles auth errors across the entire application
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = inject(Auth);
  private router = inject(Router);
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept requests to Firebase Cloud Functions
    if (!req.url.includes('cloudfunctions.net')) {
      return next.handle(req);
    }
    
    console.log('AuthInterceptor: Intercepting request to', req.url);
    
    return from(this.addAuthHeader(req)).pipe(
      switchMap((authReq) => {
        console.log('AuthInterceptor: Request with auth headers', authReq.headers.keys());
        return next.handle(authReq);
      }),
      retry(1), // Retry once on failure
      catchError((error: HttpErrorResponse) => this.handleAuthError(error))
    );
  }
  
  /**
   * Add authentication header to request
   */
  private async addAuthHeader(req: HttpRequest<any>): Promise<HttpRequest<any>> {
    const user = this.auth.currentUser;
    
    if (!user) {
      console.warn('AuthInterceptor: No authenticated user for request to', req.url);
      return req;
    }
    
    try {
      // Force refresh token to ensure we have the latest claims
      const idToken = await user.getIdToken(true);
      
      // Get token result to check claims
      const tokenResult = await user.getIdTokenResult();
      
      console.log('AuthInterceptor: User claims', {
        uid: user.uid,
        email: user.email,
        admin: tokenResult.claims['admin'],
        editor: tokenResult.claims['editor']
      });
      
      // Clone request and add authorization header
      const authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${idToken}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      return authReq;
    } catch (error) {
      console.error('AuthInterceptor: Failed to get auth token', error);
      throw error;
    }
  }
  
  /**
   * Handle authentication errors globally
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    console.error('AuthInterceptor: HTTP Error', {
      status: error.status,
      message: error.message,
      url: error.url
    });
    
    if (error.status === 401) {
      console.log('AuthInterceptor: 401 error - redirecting to login');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url, reason: 'session_expired' }
      });
    } else if (error.status === 403) {
      console.log('AuthInterceptor: 403 error - insufficient permissions');
      // Show user-friendly error message
      const errorMsg = 'You do not have sufficient permissions for this action. Contact an administrator if you believe this is an error.';
      alert(errorMsg);
    }
    
    return throwError(() => error);
  }
}
