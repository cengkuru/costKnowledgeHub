import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be ready
  await authService.waitForAuthState();

  return firstValueFrom(
    authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Check if user has completed profile setup
          if (!authService.hasCompletedProfile() && state.url !== '/profile-setup') {
            router.navigate(['/profile-setup']);
            return false;
          }
          return true;
        } else {
          // Store the attempted URL for redirecting after login
          router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      })
    )
  );
};
