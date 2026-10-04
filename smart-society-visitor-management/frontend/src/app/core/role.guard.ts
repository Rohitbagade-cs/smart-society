import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Role } from './models';

/**
 * Usage: canActivate: [roleGuard], data: { roles: ['admin'] }
 * Redirects anonymous users to /login and wrong-role users to their own home.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  const roles = route.data?.['roles'] as Role[] | undefined;
  if (roles?.length && !auth.hasRole(...roles)) {
    router.navigate([auth.homeRoute()]);
    return false;
  }
  return true;
};
