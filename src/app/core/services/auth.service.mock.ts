import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Mock Auth Service for demo purposes
 * This simulates authentication without Firebase
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  
  constructor(private router: Router) {
    // Check localStorage for mock user
    const savedUser = localStorage.getItem('mockUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }
  
  async signIn(email: string, password: string, rememberMe: boolean = false): Promise<any> {
    // Mock authentication - accept any email/password
    const mockUser = {
      uid: 'mock-user-123',
      email: email,
      displayName: email.split('@')[0]
    };
    
    // Save to localStorage if remember me
    if (rememberMe) {
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
    } else {
      sessionStorage.setItem('mockUser', JSON.stringify(mockUser));
    }
    
    this.currentUserSubject.next(mockUser);
    
    // Navigate to admin dashboard
    await this.router.navigate(['/admin']);
    
    return { user: mockUser };
  }
  
  async signUp(email: string, password: string): Promise<any> {
    // Same as sign in for mock
    return this.signIn(email, password, true);
  }
  
  async signOut(): Promise<void> {
    localStorage.removeItem('mockUser');
    sessionStorage.removeItem('mockUser');
    this.currentUserSubject.next(null);
    await this.router.navigate(['/login']);
  }
  
  async sendPasswordResetEmail(email: string): Promise<void> {
    // Mock password reset
    console.log(`Password reset email would be sent to: ${email}`);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  get currentUser(): any {
    return this.currentUserSubject.value;
  }
  
  get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }
  
  get userEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }
  
  get userId(): string | null {
    return this.currentUserSubject.value?.uid || null;
  }
}