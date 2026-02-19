import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { accounts, journalEntries, journalLines } from '../schema/schema.js';
import { IAccountingRepository } from '@nuqtaplus/core';
import type { Account, JournalEntry, JournalLine } from '@nuqtaplus/core';

export class SqliteAccountingRepository implements IAccountingRepository {
  constructor(private db: DbClient) {}

  createJournalEntry(entry: JournalEntry): JournalEntry {
    return this.createJournalEntrySync(entry);
  }

  createJournalEntrySync(entry: JournalEntry): JournalEntry {
    const lines = entry.lines || [];
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Unbalanced journal entry: debit=${totalDebit}, credit=${totalCredit}, entry=${entry.entryNumber}`
      );
    }

    const now = new Date().toISOString();
    const row = this.db
      .insert(journalEntries)
      .values({
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate || now,
        description: entry.description,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        isPosted: entry.isPosted ?? true,
        totalAmount: entry.totalAmount,
        currency: entry.currency || 'IQD',
        notes: entry.notes,
        createdAt: now,
        createdBy: entry.createdBy,
      })
      .returning()
      .get();

    if (lines.length > 0) {
      for (const line of lines) {
        this.db
          .insert(journalLines)
          .values({
            journalEntryId: row.id,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
            createdAt: now,
          })
          .run();
      }
    }

    return { ...entry, id: row.id } as JournalEntry;
  }

  createAccountSync(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const existing = this.findAccountByCode(account.code);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const inserted = this.db
      .insert(accounts)
      .values({
        code: account.code,
        name: account.name,
        nameAr: account.nameAr || null,
        accountType: account.accountType,
        parentId: account.parentId || null,
        isSystem: account.isSystem ?? true,
        isActive: account.isActive ?? true,
        balance: account.balance ?? 0,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning()
      .get();

    if (inserted) {
      return inserted as unknown as Account;
    }

    const afterConflict = this.findAccountByCode(account.code);
    if (afterConflict) {
      return afterConflict;
    }

    throw new Error(`Failed to create account with code ${account.code}`);
  }

  findAccountByCode(code: string): Account | null {
    const row = this.db.select().from(accounts).where(eq(accounts.code, code)).get();
    return (row as unknown as Account) || null;
  }

  async getAccounts(): Promise<Account[]> {
    const rows = this.db.select().from(accounts).orderBy(accounts.code).all();
    return rows as unknown as Account[];
  }

  async getJournalEntries(params?: {
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: JournalEntry[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (params?.sourceType) {
      conditions.push(eq(journalEntries.sourceType, params.sourceType));
    }
    if (params?.dateFrom) {
      conditions.push(gte(journalEntries.entryDate, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(journalEntries.entryDate, params.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = this.db.select().from(journalEntries).orderBy(desc(journalEntries.entryDate));

    if (whereClause) query.where(whereClause);
    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const rows = query.all();

    // Enrich each entry with its lines
    const items: JournalEntry[] = rows.map((row) => {
      const lines = this.db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, row.id))
        .all();
      return { ...row, lines } as unknown as JournalEntry;
    });

    const countResult = this.db.select({ count: sql<number>`count(*)` }).from(journalEntries);
    if (whereClause) countResult.where(whereClause);
    const total = countResult.get()?.count || 0;

    return { items, total };
  }

  async getEntryById(id: number): Promise<JournalEntry | null> {
    const row = this.db.select().from(journalEntries).where(eq(journalEntries.id, id)).get();
    if (!row) return null;

    const lines = this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, id))
      .all();

    return { ...row, lines } as unknown as JournalEntry;
  }

  async getTrialBalance(params?: { dateFrom?: string; dateTo?: string }) {
    // Get all active accounts
    const allAccounts = this.db.select().from(accounts).where(eq(accounts.isActive, true)).all();

    // For each account sum debits and credits from journal lines
    const result = allAccounts.map((acct) => {
      const conditions: ReturnType<typeof eq>[] = [eq(journalLines.accountId, acct.id)];

      // If date filters, join with journal_entries to filter by date
      let debitTotal = 0;
      let creditTotal = 0;

      if (params?.dateFrom || params?.dateTo) {
        // Use a raw SQL approach for filtered sums
        const dateConditions: string[] = [];
        if (params?.dateFrom) dateConditions.push(`je.entry_date >= '${params.dateFrom}'`);
        if (params?.dateTo) dateConditions.push(`je.entry_date <= '${params.dateTo}'`);
        const dateWhere = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

        const sums = this.db.all(sql`
          SELECT
            COALESCE(SUM(jl.debit), 0) as debit_total,
            COALESCE(SUM(jl.credit), 0) as credit_total
          FROM journal_lines jl
          JOIN journal_entries je ON jl.journal_entry_id = je.id
          WHERE jl.account_id = ${acct.id}
            AND je.is_posted = 1
            ${sql.raw(dateWhere)}
        `) as any[];

        if (sums.length > 0) {
          debitTotal = sums[0].debit_total || 0;
          creditTotal = sums[0].credit_total || 0;
        }
      } else {
        const sums = this.db.all(sql`
          SELECT
            COALESCE(SUM(jl.debit), 0) as debit_total,
            COALESCE(SUM(jl.credit), 0) as credit_total
          FROM journal_lines jl
          JOIN journal_entries je ON jl.journal_entry_id = je.id
          WHERE jl.account_id = ${acct.id}
            AND je.is_posted = 1
        `) as any[];

        if (sums.length > 0) {
          debitTotal = sums[0].debit_total || 0;
          creditTotal = sums[0].credit_total || 0;
        }
      }

      return {
        accountId: acct.id,
        code: acct.code,
        name: acct.name,
        accountType: acct.accountType,
        debitTotal,
        creditTotal,
        balance: debitTotal - creditTotal,
      };
    });

    return result;
  }

  async getProfitLoss(params?: { dateFrom?: string; dateTo?: string }) {
    const trial = await this.getTrialBalance(params);

    const revenue = trial
      .filter((r) => r.accountType === 'revenue')
      .map((r) => ({ accountId: r.accountId, name: r.name, amount: r.creditTotal - r.debitTotal }));

    const expenses = trial
      .filter((r) => r.accountType === 'expense')
      .map((r) => ({ accountId: r.accountId, name: r.name, amount: r.debitTotal - r.creditTotal }));

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  async getBalanceSheet(params?: { asOfDate?: string }) {
    const dateParams = params?.asOfDate ? { dateTo: params.asOfDate } : undefined;
    const trial = await this.getTrialBalance(dateParams);

    const assets = trial
      .filter((r) => r.accountType === 'asset')
      .map((r) => ({
        accountId: r.accountId,
        name: r.name,
        balance: r.debitTotal - r.creditTotal,
      }));

    const liabilities = trial
      .filter((r) => r.accountType === 'liability')
      .map((r) => ({
        accountId: r.accountId,
        name: r.name,
        balance: r.creditTotal - r.debitTotal,
      }));

    const equity = trial
      .filter((r) => r.accountType === 'equity')
      .map((r) => ({
        accountId: r.accountId,
        name: r.name,
        balance: r.creditTotal - r.debitTotal,
      }));

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((s, a) => s + a.balance, 0),
      totalLiabilities: liabilities.reduce((s, l) => s + l.balance, 0),
      totalEquity: equity.reduce((s, e) => s + e.balance, 0),
    };
  }
}
