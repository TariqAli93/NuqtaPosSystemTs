import type { RouteRecordRaw } from 'vue-router';

export const accountingRoutes: RouteRecordRaw[] = [
  {
    path: 'accounting',
    name: 'Accounting',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'accounts' },
    }),
  },
  {
    path: 'accounting/journal',
    name: 'JournalEntries',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'journal' },
    }),
  },
  {
    path: 'accounting/journal/:id',
    name: 'JournalEntryDetail',
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
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'trial' },
    }),
  },
  {
    path: 'accounting/reports/pnl',
    name: 'ProfitLoss',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'pnl' },
    }),
  },
  {
    path: 'accounting/reports/balance-sheet',
    name: 'BalanceSheet',
    redirect: (to) => ({
      name: 'FinanceInventoryWorkspace',
      query: { ...to.query, section: 'accounting', accountingTab: 'balance' },
    }),
  },
];
