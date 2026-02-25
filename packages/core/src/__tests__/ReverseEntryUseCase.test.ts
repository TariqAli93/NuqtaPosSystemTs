import { describe, expect, it } from 'vitest';
import { ReverseEntryUseCase } from '../use-cases/posting/ReverseEntryUseCase';
import type { IPostingRepository } from '../interfaces/IPostingRepository';
import type { IAccountingRepository } from '../interfaces/IAccountingRepository';
import type { JournalEntry } from '../entities/Accounting';
import { InvalidStateError, NotFoundError } from '../errors/DomainErrors';

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 10,
    entryNumber: 'JE-10',
    entryDate: '2026-01-01',
    description: 'Test entry',
    sourceType: 'sale',
    sourceId: 1,
    isPosted: true,
    isReversed: false,
    reversalOfId: null,
    postingBatchId: 99,
    totalAmount: 25000,
    currency: 'IQD',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 1,
    lines: [],
    ...overrides,
  } as JournalEntry;
}

function makePostingRepo(options?: { locked?: boolean }) {
  const reversalCalls: number[] = [];
  const voidCalls: number[] = [];

  const repo: IPostingRepository = {
    createBatch: () => {
      throw new Error('Not implemented');
    },
    getBatches: () => ({ items: [], total: 0 }),
    getBatchById: () => null,
    getUnpostedEntries: () => [],
    getPostedEntryIdsByBatch: () => [],
    markEntriesAsPosted: () => 0,
    createReversalEntry: (originalEntryId: number) => {
      reversalCalls.push(originalEntryId);
      return makeEntry({ id: 11, reversalOfId: originalEntryId, postingBatchId: 99 });
    },
    voidUnpostedEntry: (entryId: number) => {
      voidCalls.push(entryId);
    },
    lockBatch: () => undefined,
    unlockBatch: () => undefined,
    isBatchLocked: () => options?.locked ?? false,
  };

  return { repo, reversalCalls, voidCalls };
}

function makeAccountingRepo(entry: JournalEntry | null): IAccountingRepository {
  return {
    createJournalEntry: () => {
      throw new Error('Not implemented');
    },
    createJournalEntrySync: () => {
      throw new Error('Not implemented');
    },
    createAccountSync: () => {
      throw new Error('Not implemented');
    },
    findAccountByCode: () => null,
    getAccounts: async () => [],
    getJournalEntries: async () => ({ items: [], total: 0 }),
    getEntryById: async () => entry,
    getTrialBalance: async () => [],
    getProfitLoss: async () => ({
      revenue: [],
      expenses: [],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
    }),
    getBalanceSheet: async () => ({
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      equityAccounts: 0,
      revenueNet: 0,
      expenseNet: 0,
      currentEarnings: 0,
      totalEquity: 0,
      difference: 0,
    }),
  };
}

describe('ReverseEntryUseCase', () => {
  it('blocks reversal when posting batch is locked', async () => {
    const entry = makeEntry({ postingBatchId: 50 });
    const { repo: postingRepo } = makePostingRepo({ locked: true });
    const accountingRepo = makeAccountingRepo(entry);
    const useCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

    await expect(useCase.getValidatedOriginalEntry(entry.id!)).rejects.toBeInstanceOf(
      InvalidStateError
    );
  });

  it('creates reversal through posting repository when entry is valid and unlocked', async () => {
    const entry = makeEntry({ postingBatchId: 51 });
    const { repo: postingRepo, reversalCalls } = makePostingRepo({ locked: false });
    const accountingRepo = makeAccountingRepo(entry);
    const useCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

    const result = await useCase.execute(entry.id!, 7);

    expect(reversalCalls).toEqual([entry.id]);
    expect(result.reversalOfId).toBe(entry.id);
  });

  it('throws not found when original entry does not exist', async () => {
    const { repo: postingRepo } = makePostingRepo({ locked: false });
    const accountingRepo = makeAccountingRepo(null);
    const useCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

    await expect(useCase.execute(999, 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('voids unposted entry in place without creating counter-entry', async () => {
    const entry = makeEntry({ isPosted: false, postingBatchId: undefined });
    const { repo: postingRepo, reversalCalls, voidCalls } = makePostingRepo({ locked: false });
    const accountingRepo = makeAccountingRepo(entry);
    const useCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

    const result = await useCase.execute(entry.id!, 7);

    expect(voidCalls).toEqual([entry.id]);
    expect(reversalCalls).toEqual([]);
    expect(result.isReversed).toBe(true);
  });

  it('throws when entry is already reversed', async () => {
    const entry = makeEntry({ isReversed: true });
    const { repo: postingRepo } = makePostingRepo({ locked: false });
    const accountingRepo = makeAccountingRepo(entry);
    const useCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

    await expect(useCase.execute(entry.id!, 1)).rejects.toBeInstanceOf(InvalidStateError);
  });
});
