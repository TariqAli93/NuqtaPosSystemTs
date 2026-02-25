import type { RouteRecordRaw } from 'vue-router';
import InventoryWorkspaceView from '../../views/inventory/InventoryWorkspaceView.vue';
import StockOverviewView from '../../views/inventory/StockOverviewView.vue';
import StockMovementsView from '../../views/inventory/StockMovementsView.vue';
import StockReconciliationView from '../../views/inventory/StockReconciliationView.vue';
import StockAlertsView from '../../views/inventory/StockAlertsView.vue';

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: 'inventory',
    component: InventoryWorkspaceView,
    meta: { requiresAccounting: true },
    children: [
      {
        path: '',
        name: 'Inventory',
        redirect: { name: 'InventoryOverview' },
      },
      {
        path: 'overview',
        name: 'InventoryOverview',
        component: StockOverviewView,
      },
      {
        path: 'movements',
        name: 'InventoryMovements',
        component: StockMovementsView,
      },
      {
        path: 'reconciliation',
        name: 'InventoryReconciliation',
        component: StockReconciliationView,
      },
      {
        path: 'alerts',
        name: 'InventoryAlerts',
        component: StockAlertsView,
      },
    ],
  },
  // Legacy redirects for backward compatibility
  {
    path: 'inventory/adjustments/new',
    name: 'StockAdjustment',
    redirect: { name: 'InventoryOverview' },
    meta: { requiresAdjustStock: true, requiresAccounting: true },
  },
  {
    path: 'workspace/finance',
    name: 'FinanceInventoryWorkspace',
    redirect: (to) => {
      const section = to.query.section as string;
      const accountingTab = to.query.accountingTab as string;

      if (section === 'accounting') {
        if (accountingTab === 'journal') return { name: 'AccountingJournal' };
        if (accountingTab === 'trial') return { name: 'AccountingTrialBalance' };
        if (accountingTab === 'pnl') return { name: 'AccountingProfitLoss' };
        if (accountingTab === 'balance') return { name: 'AccountingBalanceSheet' };
        return { name: 'AccountingAccounts' };
      }
      if (section === 'reconciliation') return { name: 'InventoryReconciliation' };
      if (section === 'ar') return { name: 'CustomerLedger' };
      if (section === 'ap') return { name: 'SupplierLedger' };
      return { name: 'InventoryOverview' };
    },
  },
];
