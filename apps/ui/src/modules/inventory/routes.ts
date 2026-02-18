import type { RouteRecordRaw } from 'vue-router';
import FinanceInventoryWorkspaceView from '../../views/finance/FinanceInventoryWorkspaceView.vue';

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: 'workspace/finance',
    name: 'FinanceInventoryWorkspace',
    component: FinanceInventoryWorkspaceView,
  },
  {
    path: 'inventory',
    name: 'Inventory',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'inventory' },
    }),
  },
  {
    path: 'inventory/movements',
    name: 'InventoryMovements',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'inventory' },
    }),
  },
  {
    path: 'inventory/adjustments/new',
    name: 'StockAdjustment',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'inventory' },
    }),
    meta: { requiresAdjustStock: true },
  },
  {
    path: 'inventory/reconciliation',
    name: 'InventoryReconciliation',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'reconciliation' },
    }),
  },
];
