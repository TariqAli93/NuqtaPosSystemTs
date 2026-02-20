import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { postingBatches, journalEntries, journalLines } from '../schema/schema.js';
import type { IPostingRepository } from '@nuqtaplus/core';
import type { PostingBatch, JournalEntry } from '@nuqtaplus/core';

type PostingBatchRow = typeof postingBatches.$inferSelect;
type JournalEntryRow = typeof journalEntries.$inferSelect;

function mapBatchRow(row: PostingBatchRow): PostingBatch {
  return {
    id: row.id,
    periodType: row.periodType as 'day' | 'month' | 'year',
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    entriesCount: row.entriesCount,
    totalAmount: row.totalAmount,
    postedAt: row.postedAt,
    postedBy: row.postedBy ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt ?? undefined,
  };
}

function mapEntryRow(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    entryNumber: row.entryNumber,
    entryDate: row.entryDate,
    description: row.description,
    sourceType: row.sourceType as JournalEntry['sourceType'],
    sourceId: row.sourceId ?? undefined,
    isPosted: row.isPosted ?? true,
    isReversed: row.isReversed ?? false,
    reversalOfId: row.reversalOfId ?? undefined,
    postingBatchId: row.postingBatchId ?? null,
    totalAmount: row.totalAmount,
    currency: row.currency,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt ?? undefined,
    createdBy: row.createdBy ?? undefined,
  };
}

export class SqlitePostingRepository implements IPostingRepository {
  constructor(private db: DbClient) {}

  createBatch(batch: Omit<PostingBatch, 'id' | 'createdAt'>): PostingBatch {
    const result = this.db
      .insert(postingBatches)
      .values({
        periodType: batch.periodType,
        periodStart: batch.periodStart,
        periodEnd: batch.periodEnd,
        entriesCount: batch.entriesCount,
        totalAmount: batch.totalAmount,
        postedAt: batch.postedAt || new Date().toISOString(),
        postedBy: batch.postedBy,
        notes: batch.notes,
      })
      .returning()
      .get();

    return mapBatchRow(result);
  }

  getBatches(params?: {
    periodType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): { items: PostingBatch[]; total: number } {
    const conditions = [];
    if (params?.periodType) {
      conditions.push(eq(postingBatches.periodType, params.periodType));
    }
    if (params?.dateFrom) {
      conditions.push(gte(postingBatches.periodStart, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(postingBatches.periodEnd, params.dateTo));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(postingBatches)
      .where(where)
      .get();
    const total = totalResult?.count ?? 0;

    let query = this.db
      .select()
      .from(postingBatches)
      .where(where)
      .orderBy(sql`${postingBatches.postedAt} DESC`);

    if (params?.limit) {
      query = query.limit(params.limit) as typeof query;
    }
    if (params?.offset) {
      query = query.offset(params.offset) as typeof query;
    }

    const rows = query.all();
    return { items: rows.map(mapBatchRow), total };
  }

  getBatchById(id: number): PostingBatch | null {
    const row = this.db.select().from(postingBatches).where(eq(postingBatches.id, id)).get();

    return row ? mapBatchRow(row) : null;
  }

  getUnpostedEntries(startDate: string, endDate: string): JournalEntry[] {
    const rows = this.db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.isPosted, false),
          gte(journalEntries.entryDate, startDate),
          lte(journalEntries.entryDate, endDate)
        )
      )
      .all();

    return rows.map((row) => {
      const lines = this.db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, row.id))
        .all();
      return { ...mapEntryRow(row), lines } as JournalEntry;
    });
  }

  getPostedEntryIdsByBatch(batchId: number): number[] {
    const rows = this.db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(and(eq(journalEntries.postingBatchId, batchId), eq(journalEntries.isPosted, true)))
      .all();
    return rows.map((row) => row.id).filter((id): id is number => typeof id === 'number');
  }

  markEntriesAsPosted(entryIds: number[], batchId: number): number {
    if (entryIds.length === 0) return 0;

    let updated = 0;
    for (const id of entryIds) {
      const result = this.db
        .update(journalEntries)
        .set({
          isPosted: true,
          postingBatchId: batchId,
        })
        .where(eq(journalEntries.id, id))
        .run();
      updated += result.changes;
    }
    return updated;
  }

  createReversalEntry(originalEntryId: number, userId: number): JournalEntry {
    // Get original entry with lines
    const original = this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, originalEntryId))
      .get();

    if (!original) {
      throw new Error(`Journal entry ${originalEntryId} not found`);
    }

    if (!original.isPosted) {
      throw new Error(`Journal entry ${originalEntryId} is not posted and cannot be reversed`);
    }

    if (original.isReversed) {
      throw new Error(`Journal entry ${originalEntryId} is already reversed`);
    }

    const originalLines = this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, originalEntryId))
      .all();

    // Create reversal entry (swap debit/credit)
    const reversalNumber = `REV-${original.entryNumber}`;
    const reversalEntry = this.db
      .insert(journalEntries)
      .values({
        entryNumber: reversalNumber,
        entryDate: new Date().toISOString(),
        description: `Reversal of ${original.entryNumber}: ${original.description}`,
        sourceType: original.sourceType,
        sourceId: original.sourceId,
        isPosted: true,
        isReversed: false,
        reversalOfId: originalEntryId,
        postingBatchId: original.postingBatchId,
        totalAmount: original.totalAmount,
        currency: original.currency,
        notes: `Auto-generated reversal of entry #${original.entryNumber}`,
        createdBy: userId,
      })
      .returning()
      .get();

    // Create reversed lines (swap debit/credit)
    for (const line of originalLines) {
      this.db
        .insert(journalLines)
        .values({
          journalEntryId: reversalEntry.id,
          accountId: line.accountId,
          debit: line.credit ?? 0, // Swap: original credit → reversal debit
          credit: line.debit ?? 0, // Swap: original debit → reversal credit
          description: `Reversal: ${line.description || ''}`,
        })
        .run();
    }

    // Mark original as reversed
    this.db
      .update(journalEntries)
      .set({ isReversed: true })
      .where(eq(journalEntries.id, originalEntryId))
      .run();

    return mapEntryRow(reversalEntry);
  }

  lockBatch(batchId: number): void {
    const batch = this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`Posting batch ${batchId} not found`);
    }
    this.db
      .update(postingBatches)
      .set({ status: 'locked' })
      .where(eq(postingBatches.id, batchId))
      .run();
  }

  unlockBatch(batchId: number): void {
    const batch = this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`Posting batch ${batchId} not found`);
    }
    this.db
      .update(postingBatches)
      .set({ status: 'posted' })
      .where(eq(postingBatches.id, batchId))
      .run();
  }

  isBatchLocked(batchId: number): boolean {
    const row = this.db
      .select({ status: postingBatches.status })
      .from(postingBatches)
      .where(eq(postingBatches.id, batchId))
      .get();
    return row?.status === 'locked';
  }
}
