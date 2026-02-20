import type { RouteRecordRaw } from 'vue-router';
import PostingView from '../../views/accounting/PostingView.vue';
import InvoicePaymentsView from '../../views/accounting/InvoicePaymentsView.vue';

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
  {
    path: 'accounting/posting',
    name: 'Posting',
    component: PostingView,
    meta: { requiresAccounting: true },
  },
  {
    path: 'invoice-payments',
    name: 'InvoicePayments',
    component: InvoicePaymentsView,
    meta: { requiresLedgers: true, requiresPaymentsOnInvoices: true },
  },
];
