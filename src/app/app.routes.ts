import { Routes } from '@angular/router';

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
    path: '**',
    redirectTo: '/home'
  }
];
