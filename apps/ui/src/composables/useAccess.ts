import { computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import * as uiAccessHelpers from '../auth/uiAccess';
import type { UserRole } from '../types/domain';

/**
 * useAccess Composable
 *
 * Provides centralized access control in the UI layer.
 * Automatically consumes user role from authStore, so components
 * don't need to pass role manually.
 *
 * Usage:
 * const { canAdjustStock, canPrintBarcodes, canManageProducts } = useAccess();
 */
export function useAccess() {
  const authStore = useAuthStore();

  const role = computed(() => authStore.user?.role as UserRole | undefined);

  return {
    // Menu/Nav visibility
    canManageProducts: computed(() =>
      role.value ? uiAccessHelpers.canManageProducts(role.value) : false
    ),
    canManageCustomers: computed(() =>
      role.value ? uiAccessHelpers.canManageCustomers(role.value) : false
    ),
    canCreateSales: computed(() =>
      role.value ? uiAccessHelpers.canCreateSales(role.value) : false
    ),
    canManageSettings: computed(() =>
      role.value ? uiAccessHelpers.canManageSettings(role.value) : false
    ),
    canManageUsers: computed(() =>
      role.value ? uiAccessHelpers.canManageUsers(role.value) : false
    ),
    canManagePurchases: computed(() =>
      role.value ? uiAccessHelpers.canManagePurchases(role.value) : false
    ),
    canManageSuppliers: computed(() =>
      role.value ? uiAccessHelpers.canManageSuppliers(role.value) : false
    ),
    canViewInventory: computed(() =>
      role.value ? uiAccessHelpers.canViewInventory(role.value) : false
    ),
    canViewAccounting: computed(() =>
      role.value ? uiAccessHelpers.canViewAccounting(role.value) : false
    ),

    // Feature-specific actions (currently unused, but now available)
    canAdjustStock: computed(() =>
      role.value ? uiAccessHelpers.canAdjustStock(role.value) : false
    ),
    canPrintBarcodes: computed(() =>
      role.value ? uiAccessHelpers.canPrintBarcodes(role.value) : false
    ),
  };
}
