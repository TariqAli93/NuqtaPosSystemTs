import type { Router } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useFeatureFlagsStore } from '../stores/featureFlagsStore';
import * as uiAccess from './uiAccess';

export function applyAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    const featureFlagsStore = useFeatureFlagsStore();

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
      await featureFlagsStore.hydrate();

      if (featureFlagsStore.simpleMode && to.name === 'POS') {
        return { name: 'SimpleSales' };
      }
      if (!featureFlagsStore.simpleMode && to.name === 'SimpleSales') {
        return { name: 'POS' };
      }
      if (!featureFlagsStore.simpleMode && to.name === 'SimpleProductCreate') {
        return { name: 'ProductWorkspace' };
      }

      const role = authStore.user?.role;
      if (!role) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresAccounting && !featureFlagsStore.accountingEnabled) {
        const routeName = String(to.name || '');
        const fallbackName = routeName.startsWith('Product') ? 'SimpleProductCreate' : 'SimpleSales';
        return {
          name: fallbackName,
          query: { blocked: 'accounting_disabled', redirect: to.fullPath },
        };
      }

      if (to.meta.requiresPurchasing && !featureFlagsStore.accountingEnabled) {
        return {
          name: 'SimpleSales',
          query: { blocked: 'purchasing_disabled', redirect: to.fullPath },
        };
      }

      if (to.meta.requiresLedgers && !featureFlagsStore.accountingEnabled) {
        return {
          name: 'SimpleSales',
          query: { blocked: 'ledgers_disabled', redirect: to.fullPath },
        };
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
