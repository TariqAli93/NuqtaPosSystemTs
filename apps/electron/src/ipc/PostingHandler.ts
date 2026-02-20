import { ipcMain } from 'electron';
import { PostPeriodUseCase } from '@nuqtaplus/core';
import {
  SqlitePostingRepository,
  SqliteSettingsRepository,
  SqliteAccountingRepository,
} from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { userContextService } from '../services/UserContextService.js';

export function registerPostingHandlers(db: DatabaseType) {
  const postingRepo = new SqlitePostingRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);

  const postPeriodUseCase = new PostPeriodUseCase(postingRepo, settingsRepo);

  /**
   * Post entries for a period (admin/manager only)
   * Creates a posting batch and marks entries as posted.
   */
  ipcMain.handle('posting:postPeriod', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin', 'manager'] });

      const body = assertPayload('posting:postPeriod', payload, ['data']);
      const data = body.data as {
        periodType?: string;
        periodStart?: string;
        periodEnd?: string;
        notes?: string;
      };

      if (!data || !data.periodType || !data.periodStart || !data.periodEnd) {
        throw buildValidationError(
          'posting:postPeriod',
          payload,
          'periodType, periodStart, and periodEnd are required'
        );
      }

      if (!['day', 'month', 'year'].includes(data.periodType)) {
        throw buildValidationError(
          'posting:postPeriod',
          payload,
          'periodType must be day, month, or year'
        );
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;

      const result = withTransaction(db.sqlite, () => {
        return postPeriodUseCase.execute(
          {
            periodType: data.periodType as 'day' | 'month' | 'year',
            periodStart: data.periodStart!,
            periodEnd: data.periodEnd!,
            notes: data.notes,
          },
          userId
        );
      });

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Get posting batches list.
   */
  ipcMain.handle('posting:getBatches', async (_event, payload) => {
    try {
      requirePermission({
        permission: 'accounting:read',
        allowRoles: ['admin', 'manager'],
      });

      const data = payload?.data || {};
      const result = postingRepo.getBatches({
        periodType: data.periodType,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        limit: data.limit || 50,
        offset: data.offset || 0,
      });

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Reverse a posted journal entry (admin only).
   */
  ipcMain.handle('posting:reverseEntry', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin'] });

      const body = assertPayload('posting:reverseEntry', payload, ['data']);
      const data = body.data as { entryId?: number };

      if (!data?.entryId || typeof data.entryId !== 'number') {
        throw buildValidationError('posting:reverseEntry', payload, 'entryId (number) is required');
      }

      const original = await accountingRepo.getEntryById(data.entryId);
      if (!original) {
        throw buildValidationError(
          'posting:reverseEntry',
          payload,
          `Journal entry ${data.entryId} was not found`
        );
      }
      if (!original.isPosted) {
        throw buildValidationError(
          'posting:reverseEntry',
          payload,
          'Only posted entries can be reversed'
        );
      }
      if (original.isReversed) {
        throw buildValidationError('posting:reverseEntry', payload, 'Entry is already reversed');
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;

      const result = withTransaction(db.sqlite, () => {
        return postingRepo.createReversalEntry(data.entryId!, userId);
      });

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Reverse all posted entries in a posting batch (admin only).
   */
  ipcMain.handle('posting:reverseBatch', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin'] });

      const body = assertPayload('posting:reverseBatch', payload, ['data']);
      const data = body.data as { batchId?: number };
      if (!data?.batchId || typeof data.batchId !== 'number') {
        throw buildValidationError('posting:reverseBatch', payload, 'batchId (number) is required');
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;
      const entryIds = postingRepo.getPostedEntryIdsByBatch(data.batchId);
      if (entryIds.length === 0) {
        throw buildValidationError(
          'posting:reverseBatch',
          payload,
          `No posted entries found for batch ${data.batchId}`
        );
      }

      const reversedEntries = withTransaction(db.sqlite, () => {
        const results = [];
        for (const entryId of entryIds) {
          results.push(postingRepo.createReversalEntry(entryId, userId));
        }
        return results;
      });

      return ok({
        batchId: data.batchId,
        reversedCount: reversedEntries.length,
        entries: reversedEntries,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
