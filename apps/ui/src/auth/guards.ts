import type { Router } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useFeatureFlagsStore } from '../stores/featureFlagsStore';
import * as uiAccess from './uiAccess';

export function applyAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    const featureFlagsStore = useFeatureFlagsStore();

    // Lazy-load setup status if not yet fetched
    if (!authStore.setupStatus) {
      try {
        await authStore.checkInitialSetup();
      } catch {
        // If we can't reach the backend, allow navigation to continue
        // (the page itself will handle the error)
      }
    }

    if (to.name === 'InitialSetup') {
      if (authStore.setupStatus?.isInitialized && authStore.isSetupWizardCompleted) {
        const isAuth = await authStore.ensureAuthenticated();
        return isAuth ? { path: '/' } : { name: 'Login' };
      }
      return true;
    }

    // Block app until initial setup wizard is completed.
    if (authStore.setupStatus && (!authStore.isInitialized || !authStore.isSetupWizardCompleted)) {
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

      const role = authStore.user?.role;
      if (!role) {
        return { name: 'Forbidden' };
      }

      if (to.meta.requiresAccounting && !featureFlagsStore.accountingEnabled) {
        return {
          name: 'Dashboard',
          query: { blocked: 'accounting_disabled', redirect: to.fullPath },
        };
      }

      if (to.meta.requiresPurchasing && !featureFlagsStore.purchasesEnabled) {
        return {
          name: 'Dashboard',
          query: { blocked: 'purchasing_disabled', redirect: to.fullPath },
        };
      }

      if (to.meta.requiresLedgers && !featureFlagsStore.ledgersEnabled) {
        return {
          name: 'Dashboard',
          query: { blocked: 'ledgers_disabled', redirect: to.fullPath },
        };
      }

      if (to.meta.requiresPaymentsOnInvoices && !featureFlagsStore.paymentsOnInvoicesEnabled) {
        return {
          name: 'Dashboard',
          query: { blocked: 'invoice_payments_disabled', redirect: to.fullPath },
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
