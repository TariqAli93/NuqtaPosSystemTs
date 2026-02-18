import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  inventoryClient,
  type InventoryDashboard,
  type ExpiryAlert,
  type StockAdjustmentInput,
  type StockReconciliationResult,
} from '../ipc/inventoryClient';
import type { InventoryMovement } from '@nuqtaplus/core';

export const useInventoryStore = defineStore('inventory', () => {
  const movements = ref<InventoryMovement[]>([]);
  const movementsTotal = ref(0);
  const dashboard = ref<InventoryDashboard | null>(null);
  const expiryAlerts = ref<ExpiryAlert[]>([]);
  const reconciliation = ref<StockReconciliationResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDashboard() {
    loading.value = true;
    error.value = null;
    const result = await inventoryClient.getDashboard();
    if (result.ok) {
      dashboard.value = result.data;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchMovements(params?: {
    productId?: number;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    error.value = null;
    const result = await inventoryClient.getMovements(params);
    if (result.ok) {
      movements.value = result.data.items;
      movementsTotal.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function fetchExpiryAlerts(daysAhead?: number) {
    const result = await inventoryClient.getExpiryAlerts(daysAhead);
    if (result.ok) {
      expiryAlerts.value = result.data;
    }
    return result;
  }

  async function adjustStock(data: StockAdjustmentInput) {
    loading.value = true;
    error.value = null;
    const result = await inventoryClient.adjustStock(data);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function reconcileStock(repair = false) {
    loading.value = true;
    error.value = null;
    const result = await inventoryClient.reconcileStock(repair);
    if (result.ok) {
      reconciliation.value = result.data;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  return {
    movements,
    movementsTotal,
    dashboard,
    expiryAlerts,
    reconciliation,
    loading,
    error,
    fetchDashboard,
    fetchMovements,
    fetchExpiryAlerts,
    reconcileStock,
    adjustStock,
  };
});
