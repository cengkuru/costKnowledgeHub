import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/services/i18n.service';
import { ResourceService } from '../../../core/services/resource.service';
import { ActivityService } from '../../../core/services/activity.service';
import { UserService } from '../../../core/services/user.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Activity } from '../../../core/models/activity.model';

interface DashboardStats {
  totalResources: number;
  publishedResources: number;
  unpublishedResources: number;
  totalViews: number;
  totalDownloads: number;
  activeUsers: number;
  monthlyGrowth: number;
  resourcesByType: { type: string; count: number }[];
  recentActivity: Activity[];
}

interface DashboardActivity extends Activity {
  displayType: string;
  displayUser?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private resourceService = inject(ResourceService);
  private activityService = inject(ActivityService);
  private userService = inject(UserService);
  private analyticsService = inject(AnalyticsService);
  
  stats$!: Observable<DashboardStats>;
  
  constructor(public i18nService: I18nService) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  private loadDashboardData(): void {
    this.stats$ = combineLatest([
      this.resourceService.resources$,
      this.activityService.getAdminActivities(10),
      this.getActiveUsersStats()
    ]).pipe(
      map(([resources, activities, userStats]) => {
        const stats: DashboardStats = {
          totalResources: resources.length,
          publishedResources: resources.filter(r => r.status === 'published').length,
          unpublishedResources: resources.filter(r => r.status !== 'published').length,
          totalViews: resources.reduce((sum, r) => sum + (r.views || 0), 0),
          totalDownloads: resources.reduce((sum, r) => sum + (r.downloads || 0), 0),
          activeUsers: userStats.activeUsers,
          monthlyGrowth: userStats.monthlyGrowth,
          resourcesByType: this.getResourcesByType(resources),
          recentActivity: activities
        };
        
        return stats;
      }),
      catchError(error => {
        console.error('Error loading dashboard data:', error);
        return of({
          totalResources: 0,
          publishedResources: 0,
          unpublishedResources: 0,
          totalViews: 0,
          totalDownloads: 0,
          activeUsers: 0,
          monthlyGrowth: 0,
          resourcesByType: [],
          recentActivity: []
        } as DashboardStats);
      })
    );
  }
  
  private getResourcesByType(resources: any[]): { type: string; count: number }[] {
    const typeCount: Record<string, number> = {};
    
    resources.forEach(resource => {
      typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([type, count]) => ({
      type: this.formatResourceType(type),
      count
    }));
  }
  
  private formatResourceType(type: string): string {
    const typeMap: Record<string, string> = {
      'guide': 'Implementation Guides',
      'case-study': 'Case Studies',
      'report': 'Research Reports',
      'dataset': 'Datasets',
      'tool': 'Tools & Templates',
      'policy': 'Policy Briefs',
      'template': 'Templates',
      'infographic': 'Infographics',
      'other': 'Other Resources'
    };
    
    return typeMap[type] || type;
  }
  
  
  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      // Resource activities
      'resource_add': 'M12 4v16m8-8H4',
      'resource_update': 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      'resource_publish': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'resource_unpublish': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      'resource_delete': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      'resource_view': 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      'resource_download': 'M12 15v-8m0 0l-3 3m3-3l3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z',
      'resource_search': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      'resource_filter': 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
      // User activities
      'user_login': 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
      'user_logout': 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      'user_register': 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
    };
    
    return icons[type] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
  
  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      // Resource activities
      'resource_add': 'text-green-600',
      'resource_update': 'text-blue-600',
      'resource_publish': 'text-purple-600',
      'resource_unpublish': 'text-orange-600',
      'resource_delete': 'text-red-600',
      'resource_view': 'text-gray-600',
      'resource_download': 'text-amber-600',
      'resource_search': 'text-indigo-600',
      'resource_filter': 'text-cyan-600',
      // User activities
      'user_login': 'text-green-600',
      'user_logout': 'text-gray-600',
      'user_register': 'text-blue-600'
    };
    
    return colors[type] || 'text-gray-600';
  }
  
  formatActivityTime(date: Date | any): string {
    // Handle Firestore Timestamp objects
    const actualDate = date.toDate ? date.toDate() : new Date(date);
    
    const now = new Date();
    const diffMs = now.getTime() - actualDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return actualDate.toLocaleDateString();
    }
  }
  
  /**
   * Get active users statistics
   */
  private getActiveUsersStats(): Observable<{ activeUsers: number; monthlyGrowth: number }> {
    return new Observable(observer => {
      this.userService.getUsers().then(users => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        
        // Count active users (users with activity in last 30 days)
        const activeUsers = users.filter(user => {
          const lastActivity = user.lastActivityAt || user.lastLoginAt;
          return lastActivity && new Date(lastActivity) >= lastMonth;
        }).length;
        
        // Calculate monthly growth
        const usersThisMonth = users.filter(user => {
          const lastActivity = user.lastActivityAt || user.lastLoginAt;
          return lastActivity && new Date(lastActivity) >= lastMonth;
        }).length;
        
        const usersLastMonth = users.filter(user => {
          const lastActivity = user.lastActivityAt || user.lastLoginAt;
          return lastActivity && 
                 new Date(lastActivity) >= twoMonthsAgo && 
                 new Date(lastActivity) < lastMonth;
        }).length;
        
        const monthlyGrowth = usersLastMonth > 0 
          ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
          : 0;
          
        observer.next({ activeUsers, monthlyGrowth });
        observer.complete();
      }).catch(error => {
        console.error('Error getting user stats:', error);
        observer.next({ activeUsers: 0, monthlyGrowth: 0 });
        observer.complete();
      });
    });
  }
  
  getActivityDescription(activity: Activity): string {
    const descriptions: Record<string, string> = {
      'resource_add': 'Added new resource',
      'resource_update': 'Updated resource',
      'resource_publish': 'Published resource',
      'resource_unpublish': 'Unpublished resource',
      'resource_delete': 'Deleted resource',
      'resource_view': 'Viewed resource',
      'resource_download': 'Downloaded resource',
      'resource_search': 'Searched for',
      'resource_filter': 'Applied filters',
      'user_login': 'Logged in',
      'user_logout': 'Logged out',
      'user_register': 'Registered new account'
    };
    
    return descriptions[activity.type] || activity.type;
  }
  
  getActivityDetails(activity: Activity): string {
    // Return resource title if available
    if (activity.resourceTitle) {
      return activity.resourceTitle;
    }
    
    // Return search query if it's a search activity
    if (activity.type === 'resource_search' && activity.metadata?.searchQuery) {
      return `"${activity.metadata.searchQuery}"`;
    }
    
    // Return filter summary if it's a filter activity
    if (activity.type === 'resource_filter' && activity.metadata?.filters) {
      const filterCount = Object.keys(activity.metadata.filters).length;
      return `${filterCount} filter${filterCount > 1 ? 's' : ''}`;
    }
    
    // Return user email for user activities
    if (activity.userEmail) {
      return activity.userEmail;
    }
    
    return '';
  }
}