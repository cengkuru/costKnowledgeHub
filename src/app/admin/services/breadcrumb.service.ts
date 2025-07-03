import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  isActive: boolean;
  translationKey?: string;
  params?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  public breadcrumbs$: Observable<BreadcrumbItem[]> = this.breadcrumbsSubject.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.createBreadcrumbs())
      )
      .subscribe(breadcrumbs => {
        this.breadcrumbsSubject.next(breadcrumbs);
      });
  }

  private createBreadcrumbs(): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with Admin home
    breadcrumbs.push({
      label: 'Admin',
      url: '/admin',
      isActive: false,
      translationKey: 'admin.title'
    });

    // Get current URL and parse segments
    const url = this.router.url;
    const urlSegments = url.split('/').filter(segment => segment && segment !== 'admin');
    
    // Build breadcrumbs based on URL segments
    let currentUrl = '/admin';
    
    for (let i = 0; i < urlSegments.length; i++) {
      const segment = urlSegments[i];
      currentUrl += `/${segment}`;
      const isLast = i === urlSegments.length - 1;
      
      const breadcrumb = this.createBreadcrumbItem(segment, currentUrl, isLast, urlSegments, i);
      if (breadcrumb) {
        breadcrumbs.push(breadcrumb);
      }
    }

    return breadcrumbs;
  }

  private createBreadcrumbItem(
    segment: string, 
    url: string, 
    isActive: boolean, 
    allSegments: string[], 
    index: number
  ): BreadcrumbItem | null {
    // Handle different route segments
    switch (segment) {
      case 'dashboard':
        return {
          label: 'Dashboard',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.menu.dashboard'
        };
        
      case 'resources':
        if (allSegments[index + 1] === 'new') {
          return {
            label: 'Resources',
            url: '/admin/resources',
            isActive: false,
            translationKey: 'admin.menu.resources'
          };
        }
        return {
          label: 'Resources',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.menu.resources'
        };
        
      case 'new':
        if (allSegments[index - 1] === 'resources') {
          return {
            label: 'New Resource',
            url: isActive ? undefined : url,
            isActive,
            translationKey: 'admin.breadcrumb.newResource'
          };
        }
        break;
        
      case 'edit':
        if (allSegments[index - 1] && allSegments[index - 2] === 'resources') {
          return {
            label: 'Edit Resource',
            url: isActive ? undefined : url,
            isActive,
            translationKey: 'admin.breadcrumb.editResource'
          };
        }
        break;
        
      case 'analytics':
        return {
          label: 'Analytics',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.menu.analytics'
        };
        
      case 'users':
        return {
          label: 'Users',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.menu.users'
        };
        
      case 'settings':
        return {
          label: 'Settings',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.menu.settings'
        };
        
      case 'upload':
        return {
          label: 'File Upload',
          url: isActive ? undefined : url,
          isActive,
          translationKey: 'admin.breadcrumb.fileUpload'
        };
        
      default:
        // Handle dynamic segments (like resource IDs)
        if (allSegments[index - 1] === 'resources' && allSegments[index + 1] === 'edit') {
          // This is a resource ID, skip it for now
          return null;
        }
        
        // Generic fallback for unknown segments
        return {
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          url: isActive ? undefined : url,
          isActive,
          translationKey: undefined
        };
    }
    
    return null;
  }

  // Method to manually set breadcrumbs for complex scenarios
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  // Method to add dynamic breadcrumb (e.g., resource title)
  updateLastBreadcrumb(label: string, translationKey?: string): void {
    const currentBreadcrumbs = this.breadcrumbsSubject.value;
    if (currentBreadcrumbs.length > 0) {
      const lastIndex = currentBreadcrumbs.length - 1;
      currentBreadcrumbs[lastIndex] = {
        ...currentBreadcrumbs[lastIndex],
        label,
        translationKey
      };
      this.breadcrumbsSubject.next([...currentBreadcrumbs]);
    }
  }
}