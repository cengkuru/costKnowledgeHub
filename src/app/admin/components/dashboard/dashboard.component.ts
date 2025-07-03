import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/services/i18n.service';
import { ResourceService } from '../../../core/services/resource.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface DashboardStats {
  totalResources: number;
  publishedResources: number;
  unpublishedResources: number;
  totalViews: number;
  totalDownloads: number;
  resourcesByType: { type: string; count: number }[];
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type: 'resource_added' | 'resource_updated' | 'resource_published' | 'resource_viewed' | 'resource_downloaded';
  resourceTitle: string;
  timestamp: Date;
  user?: string;
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
  
  stats$!: Observable<DashboardStats>;
  
  constructor(public i18nService: I18nService) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  private loadDashboardData(): void {
    this.stats$ = this.resourceService.resources$.pipe(
      map(resources => {
        const stats: DashboardStats = {
          totalResources: resources.length,
          publishedResources: resources.filter(r => r.featured).length, // Using featured as proxy for published
          unpublishedResources: resources.filter(r => !r.featured).length,
          totalViews: resources.reduce((sum, r) => sum + (r.views || 0), 0),
          totalDownloads: resources.reduce((sum, r) => sum + (r.downloads || 0), 0),
          resourcesByType: this.getResourcesByType(resources),
          recentActivity: this.generateRecentActivity(resources)
        };
        
        return stats;
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
  
  private generateRecentActivity(resources: any[]): Activity[] {
    // Simulating recent activity - in real app, this would come from analytics/audit logs
    const activities: Activity[] = [
      {
        id: '1',
        type: 'resource_added',
        resourceTitle: 'CoST Infrastructure Data Standard Guide',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user: 'admin@cost.org'
      },
      {
        id: '2',
        type: 'resource_updated',
        resourceTitle: 'Thailand Infrastructure Transparency Success Story',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        user: 'editor@cost.org'
      },
      {
        id: '3',
        type: 'resource_published',
        resourceTitle: 'Multi-stakeholder Platform Setup Guide',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        user: 'admin@cost.org'
      },
      {
        id: '4',
        type: 'resource_viewed',
        resourceTitle: 'Infrastructure Transparency Index 2024',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        id: '5',
        type: 'resource_downloaded',
        resourceTitle: 'Digital Procurement Tools Toolkit',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }
    ];
    
    return activities;
  }
  
  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      'resource_added': 'M12 4v16m8-8H4',
      'resource_updated': 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      'resource_published': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'resource_viewed': 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      'resource_downloaded': 'M12 15v-8m0 0l-3 3m3-3l3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z'
    };
    
    return icons[type] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
  
  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      'resource_added': 'text-green-600',
      'resource_updated': 'text-blue-600',
      'resource_published': 'text-purple-600',
      'resource_viewed': 'text-gray-600',
      'resource_downloaded': 'text-amber-600'
    };
    
    return colors[type] || 'text-gray-600';
  }
  
  formatActivityTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      return date.toLocaleDateString();
    }
  }
}