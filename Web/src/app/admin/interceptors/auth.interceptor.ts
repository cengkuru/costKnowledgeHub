import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor to add JWT token to requests and handle 401 errors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth for non-admin/auth endpoints
  if (!req.url.includes('/admin') && !req.url.includes('/auth')) {
    return next(req);
  }

  // Skip adding token to login endpoint
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  // Add token if available
  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized
      if (error.status === 401) {
        // Don't retry or logout for logout/refresh endpoints to prevent infinite loops
        if (req.url.includes('/auth/logout') || req.url.includes('/auth/refresh')) {
          return throwError(() => error);
        }

        // Try to refresh token
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap(tokens => {
              // Retry original request with new token
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokens.accessToken}`
                }
              });
              return next(newReq);
            }),
            catchError(() => {
              // Refresh failed, logout
              authService.logout();
              return throwError(() => error);
            })
          );
        } else {
          // No refresh token
          authService.logout();
        }
      }

      return throwError(() => error);
    })
  );
};
