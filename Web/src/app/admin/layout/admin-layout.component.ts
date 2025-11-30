import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-cost-offwhite flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-white border-r border-cost-light/30 flex flex-col">
        <!-- Logo -->
        <div class="p-6 border-b border-cost-light/30">
          <a routerLink="/admin" class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cost-red rounded-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span class="text-xl font-bold text-cost-blue">CoST Admin</span>
          </a>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-1">
          <a routerLink="/admin" routerLinkActive="bg-cost-blue/10 text-cost-blue" [routerLinkActiveOptions]="{exact: true}"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-cost-dark hover:bg-cost-light/30 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Dashboard
          </a>
          <a routerLink="/admin/resources" routerLinkActive="bg-cost-blue/10 text-cost-blue"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-cost-dark hover:bg-cost-light/30 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Resources
          </a>
          <a routerLink="/admin/topics" routerLinkActive="bg-cost-blue/10 text-cost-blue"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-cost-dark hover:bg-cost-light/30 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Topics
          </a>
          <a routerLink="/admin/users" routerLinkActive="bg-cost-blue/10 text-cost-blue"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-cost-dark hover:bg-cost-light/30 transition-colors">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Users
          </a>
        </nav>

        <!-- User section -->
        <div class="p-4 border-t border-cost-light/30">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-cost-blue/10 rounded-full flex items-center justify-center">
              <span class="text-cost-blue font-medium">{{ getUserInitials() }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-cost-dark truncate">{{ authService.userName() || 'Admin' }}</p>
              <p class="text-xs text-cost-medium truncate">{{ authService.userEmail() }}</p>
            </div>
          </div>
          <div class="space-y-1">
            <a routerLink="/admin/settings" routerLinkActive="bg-cost-blue/10 text-cost-blue"
              class="flex items-center gap-3 px-4 py-2 rounded-xl text-cost-medium hover:bg-cost-light/30 transition-colors text-sm">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m-2-2l-4.2-4.2" />
              </svg>
              Settings
            </a>
            <a routerLink="/"
              class="flex items-center gap-3 px-4 py-2 rounded-xl text-cost-medium hover:bg-cost-light/30 transition-colors text-sm">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              View Public Site
            </a>
            <button (click)="logout()"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-cost-medium hover:bg-red-50 hover:text-red-600 transition-colors text-sm">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  constructor(public authService: AuthService) {}

  getUserInitials(): string {
    const name = this.authService.userName();
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    const email = this.authService.userEmail();
    return email ? email[0].toUpperCase() : 'A';
  }

  logout(): void {
    this.authService.logout();
  }
}
