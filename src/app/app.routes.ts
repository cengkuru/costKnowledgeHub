import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'resources',
    loadComponent: () => import('./features/resources/resource-list.component').then(m => m.ResourceListComponent)
  },
  {
    path: 'resources/:id',
    loadComponent: () => import('./features/detail/resource-detail.component').then(m => m.ResourceDetailComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'test-auth',
    loadComponent: () => import('./features/auth/test-auth.component').then(m => m.TestAuthComponent)
  },
  {
    path: 'profile-setup',
    loadComponent: () => import('./features/auth/profile-setup.component').then(m => m.ProfileSetupComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];
