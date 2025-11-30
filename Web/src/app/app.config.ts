import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, Routes } from '@angular/router';
import { App } from './app';
import { ResourceDetailComponent } from './components/resource-detail/resource-detail.component';
import { authInterceptor } from './admin/interceptors/auth.interceptor';

export const routes: Routes = [
  { path: '', component: App },
  { path: 'resource/:id', component: ResourceDetailComponent },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  },
  { path: '**', redirectTo: '' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
  ]
};
