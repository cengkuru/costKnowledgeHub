import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';
import { authGuard } from '../core/guards/auth.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'resources',
        loadComponent: () => import('./components/resources/resource-management.component').then(m => m.ResourceManagementComponent)
      },
      {
        path: 'resources/new',
        loadComponent: () => import('./components/resources/resource-form.component').then(m => m.ResourceFormComponent)
      },
      {
        path: 'resources/:id/edit',
        loadComponent: () => import('./components/resources/resource-form.component').then(m => m.ResourceFormComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/users/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./components/file-upload/file-upload.component').then(m => m.FileUploadComponent)
      }
    ]
  }
];