import { Account, JournalEntry } from '../entities/Accounting.js';

export interface IAccountingRepository {
  createJournalEntry(entry: JournalEntry): JournalEntry;
  createJournalEntrySync(entry: JournalEntry): JournalEntry;
  findAccountByCode(code: string): Account | null;
  getAccounts(): Promise<Account[]>;
  getJournalEntries(params?: {
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: JournalEntry[]; total: number }>;
  getEntryById(id: number): Promise<JournalEntry | null>;
  getTrialBalance(params?: { dateFrom?: string; dateTo?: string }): Promise<
    {
      accountId: number;
      code: string;
      name: string;
      accountType: string;
      debitTotal: number;
      creditTotal: number;
      balance: number;
    }[]
  >;
  getProfitLoss(params?: { dateFrom?: string; dateTo?: string }): Promise<{
    revenue: { accountId: number; name: string; amount: number }[];
    expenses: { accountId: number; name: string; amount: number }[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }>;
  getBalanceSheet(params?: { asOfDate?: string }): Promise<{
    assets: { accountId: number; name: string; balance: number }[];
    liabilities: { accountId: number; name: string; balance: number }[];
    equity: { accountId: number; name: string; balance: number }[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }>;
}
