import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthTokens, LoginResponse } from '../models/admin-types';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl;

  // Signals for reactive state
  private _currentUser = signal<User | null>(this.loadUserFromStorage());
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public computed signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser() && !!this.getToken());
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly userEmail = computed(() => this._currentUser()?.email ?? '');
  readonly userName = computed(() => this._currentUser()?.name ?? '');
  readonly userRole = computed(() => this._currentUser()?.role ?? null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check token validity on service init
    this.validateToken();
  }

  /**
   * Login with email and password
   */
  login(email: string, password: string): Observable<LoginResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        this.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
        this.setUser(response.user);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set(error.error?.error || 'Login failed');
        throw error;
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    // Store token before clearing (needed for the logout API call)
    const token = this.getToken();

    // Clear local storage first to prevent any other requests
    this.clearTokens();
    this._currentUser.set(null);

    // Try to call logout endpoint if we had a token (fire and forget)
    // Send token in request body since we already cleared localStorage
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    // Navigate to login
    this.router.navigate(['/admin/login']);
  }

  /**
   * Get current user from API
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.setUser(user);
      }),
      catchError(error => {
        this.logout();
        throw error;
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token');
    }

    return this.http.post<AuthTokens>(`${this.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(tokens => {
        this.setTokens(tokens);
      }),
      catchError(error => {
        this.logout();
        throw error;
      })
    );
  }

  /**
   * Get stored access token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Clear any error
   */
  clearError(): void {
    this._error.set(null);
  }

  // Private methods

  private setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private setUser(user: User): void {
    this._currentUser.set(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private loadUserFromStorage(): User | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  private validateToken(): void {
    const token = this.getToken();
    if (!token) {
      this._currentUser.set(null);
      return;
    }

    // Check if token is expired (basic JWT decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= exp) {
        // Token expired, try refresh
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      }
    } catch {
      // Invalid token format
      this.clearTokens();
      this._currentUser.set(null);
    }
  }
}
