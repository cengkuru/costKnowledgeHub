import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { Language } from '../core/models/resource.model';
import { NotificationService } from '../core/services/notification.service';
import { Notification, getNotificationColor, formatNotificationTime } from '../core/models/notification.model';
import { Subscription } from 'rxjs';

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
  private notificationService = inject(NotificationService);
  
  // Real notifications from service
  notifications: Notification[] = [];
  unreadCount = 0;
  
  // User role
  isAdminRole = false;
  
  // Subscriptions
  private notificationsSubscription?: Subscription;
  private unreadCountSubscription?: Subscription;
  
  // Available languages
  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];
  
  // Helper functions for notifications
  getNotificationColor = getNotificationColor;
  formatNotificationTime = formatNotificationTime;
  
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
    if (this.isNotificationsOpen && this.unreadCount > 0) {
      this.notificationService.markAllAsRead();
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
  
  isRouteActive(path: string): boolean {
    return this.router.url === path;
  }
  
  get currentLanguage(): Language {
    return this.i18nService.getCurrentLanguage();
  }
  
  changeLanguage(languageCode: string): void {
    this.i18nService.setLanguage(languageCode as Language);
    this.isLanguageMenuOpen = false;
  }
  
  get unreadNotificationsCount(): number {
    return this.unreadCount;
  }
  
  async clearNotification(notificationId: string): Promise<void> {
    await this.notificationService.deleteNotification(notificationId);
  }
  
  async clearAllNotifications(): Promise<void> {
    await this.notificationService.clearAllNotifications();
    this.isNotificationsOpen = false;
  }
  
  navigateToNotificationAction(notification: Notification): void {
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.isNotificationsOpen = false;
      
      // Mark as read if not already
      if (!notification.read) {
        this.notificationService.markAsRead(notification.id);
      }
    }
  }
  
  navigateToProfile(): void {
    this.router.navigate(['/admin/profile']);
    this.isProfileMenuOpen = false;
  }
  
  navigateToSettings(): void {
    this.router.navigate(['/admin/settings']);
    this.isProfileMenuOpen = false;
  }
  
  // Close dropdowns when clicking outside
  ngOnInit(): void {
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    
    // Initialize notification service with current user
    this.authService.currentUser$.subscribe(async user => {
      this.notificationService.startListeningForUser(user?.uid || null);
      
      // Check admin status when user changes
      if (user) {
        this.isAdminRole = await this.authService.isAdmin();
      } else {
        this.isAdminRole = false;
      }
    });
    
    // Subscribe to notifications
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
    
    // Subscribe to unread count
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadCount = count;
      }
    );
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    
    // Unsubscribe from notifications
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
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