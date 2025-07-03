import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { Language } from '../core/models/resource.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = true;
  isProfileMenuOpen = false;
  isSidebarCollapsed = false; // New property for mini variant
  isLanguageMenuOpen = false;
  isNotificationsOpen = false;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Mock notifications - in production, this would come from a service
  notifications = [
    {
      id: 1,
      type: 'info',
      title: 'New resource published',
      message: 'A new implementation guide has been published',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Upload successful',
      message: 'Your file has been uploaded successfully',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'warning',
      title: 'System maintenance',
      message: 'Scheduled maintenance on Sunday at 2 AM',
      time: '2 hours ago',
      read: true
    }
  ];
  
  // Available languages
  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];
  
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
    // Close other dropdowns
    this.isLanguageMenuOpen = false;
    this.isNotificationsOpen = false;
  }
  
  toggleLanguageMenu(): void {
    this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
    // Close other dropdowns
    this.isProfileMenuOpen = false;
    this.isNotificationsOpen = false;
  }
  
  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    // Close other dropdowns
    this.isProfileMenuOpen = false;
    this.isLanguageMenuOpen = false;
    
    // Mark all notifications as read when opened
    if (this.isNotificationsOpen) {
      this.markAllNotificationsAsRead();
    }
  }
  
  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  
  navigateTo(path: string): void {
    this.router.navigate([path]);
    // Close mobile sidebar after navigation
    if (window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
  }
  
  get currentLanguage(): Language {
    return this.i18nService.getCurrentLanguage();
  }
  
  changeLanguage(languageCode: string): void {
    this.i18nService.setLanguage(languageCode as Language);
    this.isLanguageMenuOpen = false;
  }
  
  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  
  markAllNotificationsAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }
  
  markNotificationAsRead(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }
  
  clearNotification(notificationId: number): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }
  
  clearAllNotifications(): void {
    this.notifications = [];
    this.isNotificationsOpen = false;
  }
  
  // Close dropdowns when clicking outside
  ngOnInit(): void {
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }
  
  private handleOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isProfileMenuOpen = false;
      this.isLanguageMenuOpen = false;
      this.isNotificationsOpen = false;
    }
  }
}