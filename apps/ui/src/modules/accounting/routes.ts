import type { RouteRecordRaw } from 'vue-router';
import AccountingWorkspaceView from '../../views/accounting/AccountingWorkspaceView.vue';
import ChartOfAccountsView from '../../views/accounting/ChartOfAccountsView.vue';
import JournalEntriesView from '../../views/accounting/JournalEntriesView.vue';
import TrialBalanceView from '../../views/accounting/TrialBalanceView.vue';
import ProfitLossView from '../../views/accounting/ProfitLossView.vue';
import BalanceSheetView from '../../views/accounting/BalanceSheetView.vue';
import PostingView from '../../views/accounting/PostingView.vue';
import InvoicePaymentsView from '../../views/accounting/InvoicePaymentsView.vue';
import JournalEntryDetailView from '../../views/accounting/JournalEntryDetailView.vue';

export const accountingRoutes: RouteRecordRaw[] = [
  {
    path: 'accounting',
    component: AccountingWorkspaceView,
    meta: { requiresAccounting: true },
    children: [
      {
        path: '',
        name: 'Accounting',
        redirect: { name: 'AccountingAccounts' },
      },
      {
        path: 'accounts',
        name: 'AccountingAccounts',
        component: ChartOfAccountsView,
      },
      {
        path: 'journal',
        name: 'AccountingJournal',
        component: JournalEntriesView,
      },
      {
        path: 'trial-balance',
        name: 'AccountingTrialBalance',
        component: TrialBalanceView,
      },
      {
        path: 'profit-loss',
        name: 'AccountingProfitLoss',
        component: ProfitLossView,
      },
      {
        path: 'balance-sheet',
        name: 'AccountingBalanceSheet',
        component: BalanceSheetView,
      },
    ],
  },
  {
    path: 'accounting/posting',
    name: 'Posting',
    component: PostingView,
    meta: { requiresAccounting: true },
  },
  {
    path: 'accounting/journal/:id',
    name: 'JournalEntryDetail',
    component: JournalEntryDetailView,
    meta: { requiresAccounting: true },
  },
  {
    path: 'invoice-payments',
    name: 'InvoicePayments',
    component: InvoicePaymentsView,
    meta: { requiresLedgers: true, requiresPaymentsOnInvoices: true },
  },
  // Legacy redirects for backward compatibility
  {
    path: 'accounting/reports/trial-balance',
    name: 'TrialBalance',
    redirect: { name: 'AccountingTrialBalance' },
  },
  {
    path: 'accounting/reports/pnl',
    name: 'ProfitLoss',
    redirect: { name: 'AccountingProfitLoss' },
  },
  {
    path: 'accounting/reports/balance-sheet',
    name: 'BalanceSheet',
    redirect: { name: 'AccountingBalanceSheet' },
  },
];
