import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-cost-offwhite flex items-center justify-center px-4">
      <div class="max-w-md w-full">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-3">
            <div class="w-12 h-12 bg-cost-red rounded-2xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span class="text-2xl font-bold text-cost-blue">CoST Admin</span>
          </div>
          <p class="text-cost-medium mt-2">Sign in to manage resources</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <!-- Error Message -->
          @if (authService.error()) {
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ authService.error() }}</span>
            <button (click)="authService.clearError()" class="ml-auto text-red-500 hover:text-red-700">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-cost-dark mb-2">Email</label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none transition-all"
                placeholder="admin@example.com"
              />
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-sm font-medium text-cost-dark mb-2">Password</label>
              <input
                type="password"
                id="password"
                [(ngModel)]="password"
                name="password"
                required
                class="w-full px-4 py-3 border border-cost-light/50 rounded-xl focus:ring-2 focus:ring-cost-blue/20 focus:border-cost-blue outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="authService.isLoading()"
              class="w-full bg-cost-blue text-white py-3 px-4 rounded-xl font-semibold hover:bg-cost-blue-600 focus:ring-4 focus:ring-cost-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (authService.isLoading()) {
              <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              Signing in...
              } @else {
              Sign In
              }
            </button>
          </form>

          <!-- Back to Hub Link -->
          <div class="mt-6 text-center">
            <a routerLink="/" class="text-sm text-cost-medium hover:text-cost-blue transition-colors">
              ← Back to Knowledge Hub
            </a>
          </div>
        </div>

        <!-- Request Access -->
        <p class="text-center text-sm text-cost-medium mt-6">
          Need access?
          <a href="https://infrastructuretransparency.org/contact/" target="_blank"
            class="text-cost-blue hover:underline">Request Admin Access</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/admin']);
      },
      error: () => {
        // Error is handled by AuthService
      }
    });
  }
}
