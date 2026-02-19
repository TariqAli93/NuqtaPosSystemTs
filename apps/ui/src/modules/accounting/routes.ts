import type { RouteRecordRaw } from 'vue-router';

export const accountingRoutes: RouteRecordRaw[] = [
  {
    path: 'accounting',
    name: 'Accounting',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'accounts' },
    }),
  },
  {
    path: 'accounting/journal',
    name: 'JournalEntries',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'journal' },
    }),
  },
  {
    path: 'accounting/journal/:id',
    name: 'JournalEntryDetail',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: {
        ...to.query,
        section: 'accounting',
        accountingTab: 'journal',
        entryId: String(to.params.id),
      },
    }),
  },
  {
    path: 'accounting/reports/trial-balance',
    name: 'TrialBalance',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'trial' },
    }),
  },
  {
    path: 'accounting/reports/pnl',
    name: 'ProfitLoss',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'pnl' },
    }),
  },
  {
    path: 'accounting/reports/balance-sheet',
    name: 'BalanceSheet',
    meta: { requiresAccounting: true },
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'balance' },
    }),
  },
];
