import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const publicGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to be ready
  await authService.waitForAuthState();

  return firstValueFrom(
    authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // User is already logged in, redirect to admin
          router.navigate(['/admin']);
          return false;
        }
        return true;
      })
    )
  );
};
