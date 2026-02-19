import type { RouteRecordRaw } from 'vue-router';
import FinanceInventoryWorkspaceView from '../../views/finance/FinanceInventoryWorkspaceView.vue';

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: 'workspace/finance',
    name: 'FinanceInventoryWorkspace',
    component: FinanceInventoryWorkspaceView,
    meta: { requiresAccounting: true },
  },
  {
    path: 'inventory',
    name: 'Inventory',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'inventory' },
    }),
  },
  {
    path: 'inventory/movements',
    name: 'InventoryMovements',
    meta: { requiresAccounting: true },
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
    meta: { requiresAdjustStock: true, requiresAccounting: true },
  },
  {
    path: 'inventory/reconciliation',
    name: 'InventoryReconciliation',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'reconciliation' },
    }),
  },
];
