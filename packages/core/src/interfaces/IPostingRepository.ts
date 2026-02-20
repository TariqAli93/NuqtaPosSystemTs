import { PostingBatch } from '../entities/PostingBatch.js';
import { JournalEntry } from '../entities/Accounting.js';

export interface IPostingRepository {
  /** Create a posting batch record */
  createBatch(batch: Omit<PostingBatch, 'id' | 'createdAt'>): PostingBatch;

  /** Get all posting batches with optional filters */
  getBatches(params?: {
    periodType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): { items: PostingBatch[]; total: number };

  /** Get a single batch by ID */
  getBatchById(id: number): PostingBatch | null;

  /** Get unposted journal entries for a date range */
  getUnpostedEntries(startDate: string, endDate: string): JournalEntry[];

  /** Get posted journal entry ids belonging to a posting batch */
  getPostedEntryIdsByBatch(batchId: number): number[];

  /** Mark journal entries as posted in a batch (update isPosted + postingBatchId) */
  markEntriesAsPosted(entryIds: number[], batchId: number): number;

  /** Create a reversing journal entry for a posted entry */
  createReversalEntry(originalEntryId: number, userId: number): JournalEntry;

  /** Lock a posting batch — prevents further edits to its entries */
  lockBatch(batchId: number): void;

  /** Unlock a posting batch — re-opens it for amendments */
  unlockBatch(batchId: number): void;

  /** Check whether a batch is locked */
  isBatchLocked(batchId: number): boolean;
}
