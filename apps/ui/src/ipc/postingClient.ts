import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload } from './payloads';

export interface PostingBatch {
  id: number;
  periodType: 'day' | 'month' | 'year';
  periodStart: string;
  periodEnd: string;
  entriesCount: number;
  totalAmount: number;
  postedAt: string;
  postedBy?: number;
  notes?: string;
  createdAt?: string;
  /** Batch lifecycle status — derived from lock state */
  status?: 'draft' | 'posted' | 'locked';
}

export interface PostPeriodInput {
  periodType: 'day' | 'month' | 'year';
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface ReverseBatchResult {
  batchId: number;
  reversedCount: number;
  entries: any[];
}

export const postingClient = {
  /** Post entries for a period (creates a posting batch) */
  postPeriod: (data: PostPeriodInput): Promise<ApiResult<PostingBatch>> =>
    invoke<PostingBatch>('posting:postPeriod', buildDataPayload('posting:postPeriod', data as any)),

  /** Get posting batches list */
  getBatches: (params?: {
    periodType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<{ items: PostingBatch[]; total: number }>> =>
    invoke<{ items: PostingBatch[]; total: number }>('posting:getBatches', { data: params || {} }),

  /** Reverse a posted journal entry */
  reverseEntry: (entryId: number): Promise<ApiResult<any>> =>
    invoke<any>('posting:reverseEntry', buildDataPayload('posting:reverseEntry', { entryId })),

  /** Reverse all posted entries in a posting batch */
  reverseBatch: (batchId: number): Promise<ApiResult<ReverseBatchResult>> =>
    invoke<ReverseBatchResult>(
      'posting:reverseBatch',
      buildDataPayload('posting:reverseBatch', { batchId })
    ),

  /** Lock a posting batch — prevents further edits/reversals */
  lockBatch: (batchId: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('posting:lockBatch', buildDataPayload('posting:lockBatch', { batchId })),

  /** Unlock a posting batch — re-opens for amendments */
  unlockBatch: (batchId: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>(
      'posting:unlockBatch',
      buildDataPayload('posting:unlockBatch', { batchId })
    ),

  /** Check whether a specific batch is locked */
  isBatchLocked: (batchId: number): Promise<ApiResult<{ locked: boolean }>> =>
    invoke<{ locked: boolean }>(
      'posting:isBatchLocked',
      buildDataPayload('posting:isBatchLocked', { batchId })
    ),
};
