import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'resources',
        loadComponent: () => import('./pages/resources/resource-list.component').then(m => m.ResourceListComponent)
      },
      {
        path: 'resources/new',
        loadComponent: () => import('./pages/resources/resource-form.component').then(m => m.ResourceFormComponent)
      },
      {
        path: 'resources/:id',
        loadComponent: () => import('./pages/resources/resource-form.component').then(m => m.ResourceFormComponent)
      },
      {
        path: 'topics',
        loadComponent: () => import('./pages/topics/topic-list.component').then(m => m.TopicListComponent)
      },
      {
        path: 'types',
        loadComponent: () => import('./pages/types/type-list.component').then(m => m.TypeListComponent)
      }
    ]
  }
];
