import type { ApiResult, PagedResult } from './contracts';
import type { Account, JournalEntry } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildIdPayload, buildParamsPayload } from './payloads';

export interface TrialBalanceRow {
  accountId: number;
  code: string;
  name: string;
  accountType: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface ProfitLossReport {
  revenue: { accountId: number; name: string; amount: number }[];
  expenses: { accountId: number; name: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetReport {
  assets: { accountId: number; name: string; balance: number }[];
  liabilities: { accountId: number; name: string; balance: number }[];
  equity: { accountId: number; name: string; balance: number }[];
  totalAssets: number;
  totalLiabilities: number;
  equityAccounts: number;
  revenueNet: number;
  expenseNet: number;
  currentEarnings: number;
  totalEquity: number;
  difference: number;
}

export const accountingClient = {
  getAccounts: (): Promise<ApiResult<Account[]>> => invoke<Account[]>('accounting:getAccounts', {}),
  getJournalEntries: (params?: {
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    isPosted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<JournalEntry>>> =>
    invokePaged<JournalEntry>(
      'accounting:getJournalEntries',
      buildParamsPayload('accounting:getJournalEntries', params)
    ),
  getEntryById: (id: number): Promise<ApiResult<JournalEntry | null>> =>
    invoke<JournalEntry | null>(
      'accounting:getEntryById',
      buildIdPayload('accounting:getEntryById', id)
    ),
  getTrialBalance: (params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResult<TrialBalanceRow[]>> =>
    invoke<TrialBalanceRow[]>(
      'accounting:getTrialBalance',
      buildParamsPayload('accounting:getTrialBalance', params)
    ),
  getProfitLoss: (params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResult<ProfitLossReport>> =>
    invoke<ProfitLossReport>(
      'accounting:getProfitLoss',
      buildParamsPayload('accounting:getProfitLoss', params)
    ),
  getBalanceSheet: (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResult<BalanceSheetReport>> =>
    invoke<BalanceSheetReport>(
      'accounting:getBalanceSheet',
      buildParamsPayload('accounting:getBalanceSheet', params)
    ),
};
