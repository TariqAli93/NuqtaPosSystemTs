import type { Router } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import * as uiAccess from './uiAccess';

export function applyAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    // Allow the setup page itself without any checks
    if (to.name === 'InitialSetup') {
      return true;
    }

    // Lazy-load setup status if not yet fetched
    if (!authStore.setupStatus) {
      try {
        await authStore.checkInitialSetup();
      } catch {
        // If we can't reach the backend, allow navigation to continue
        // (the page itself will handle the error)
      }
    }

    // If app is NOT initialized, redirect to setup wizard
    if (authStore.setupStatus && !authStore.isInitialized) {
      return { name: 'InitialSetup' };
    }

    if (to.meta.requiresGuest) {
      const isAuth = await authStore.ensureAuthenticated();
      if (isAuth) {
        return { name: 'Dashboard' };
      }
      return true;
    }

    if (to.meta.requiresAuth) {
      const isAuth = await authStore.ensureAuthenticated();
      if (!isAuth) {
        authStore.logout('not_authenticated');
        return { name: 'Login', query: { redirect: to.fullPath } };
      }

      authStore.startSessionCheck();

      const role = authStore.user?.role;
      if (!role) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresManageProducts && !uiAccess.canManageProducts(role)) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresManageCustomers && !uiAccess.canManageCustomers(role)) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresCreateSales && !uiAccess.canCreateSales(role)) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresManageSettings && !uiAccess.canManageSettings(role)) {
        return { name: 'Forbidden' };
      }
    }

    return true;
  });
}
