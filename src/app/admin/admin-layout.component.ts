import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  isSidebarOpen = true;
  isProfileMenuOpen = false;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  constructor(public i18nService: I18nService) {}
  
  get userEmail(): string | null {
    return this.authService.userEmail;
  }
  
  get displayName(): string | null {
    return this.authService.displayName;
  }
  
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  
  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }
  
  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  navigateTo(path: string): void {
    this.router.navigate([path]);
    // Close mobile sidebar after navigation
    if (window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
  }
}