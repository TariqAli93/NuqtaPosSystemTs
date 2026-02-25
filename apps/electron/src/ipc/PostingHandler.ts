import { ipcMain } from 'electron';
import {
  AuditService,
  PostPeriodUseCase,
  ReverseEntryUseCase,
  PostIndividualEntryUseCase,
  UnpostIndividualEntryUseCase,
} from '@nuqtaplus/core';
import {
  SqlitePostingRepository,
  SqliteSettingsRepository,
  SqliteAccountingRepository,
  SqliteAuditRepository,
} from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { userContextService } from '../services/UserContextService.js';

const POSTING_UNLOCK_FLAG_KEY = 'posting.unlock.enabled';
const POSTING_UNLOCK_ENV_FLAG = 'NUQTA_POSTING_UNLOCK_ENABLED';

export function registerPostingHandlers(db: DatabaseType) {
  const postingRepo = new SqlitePostingRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);
  const auditService = new AuditService(auditRepo);

  const postPeriodUseCase = new PostPeriodUseCase(postingRepo, settingsRepo);
  const reverseEntryUseCase = new ReverseEntryUseCase(postingRepo, accountingRepo);
  const postIndividualEntryUseCase = new PostIndividualEntryUseCase(postingRepo, accountingRepo);
  const unpostIndividualEntryUseCase = new UnpostIndividualEntryUseCase(
    postingRepo,
    accountingRepo
  );

  const isPostingUnlockEnabled = (): boolean => {
    const settingsFlag = settingsRepo.get(POSTING_UNLOCK_FLAG_KEY);
    if (settingsFlag === 'true') return true;
    return process.env[POSTING_UNLOCK_ENV_FLAG] === 'true';
  };

  /**
   * Post a single unposted journal entry
   */
  ipcMain.handle('posting:postIndividualEntry', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin', 'manager'] });

      const body = assertPayload('posting:postIndividualEntry', payload, ['data']);
      const data = body.data as { entryId?: number };

      if (!data?.entryId || typeof data.entryId !== 'number') {
        throw buildValidationError(
          'posting:postIndividualEntry',
          payload,
          'entryId (number) is required'
        );
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;

      const result = await postIndividualEntryUseCase.execute(data.entryId as number, userId);

      await auditService.logAction(
        userId,
        'posting:postIndividualEntry',
        'JournalEntry',
        result.id!,
        `Individually posted journal entry #${result.id}`,
        { entryId: result.id, entryNumber: result.entryNumber }
      );

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Unpost a single posted journal entry
   */
  ipcMain.handle('posting:unpostIndividualEntry', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin', 'manager'] });

      const body = assertPayload('posting:unpostIndividualEntry', payload, ['data']);
      const data = body.data as { entryId?: number };

      if (!data?.entryId || typeof data.entryId !== 'number') {
        throw buildValidationError(
          'posting:unpostIndividualEntry',
          payload,
          'entryId (number) is required'
        );
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;

      const result = await unpostIndividualEntryUseCase.execute(data.entryId as number, userId);

      await auditService.logAction(
        userId,
        'posting:unpostIndividualEntry',
        'JournalEntry',
        result.id!,
        `Individually unposted journal entry #${result.id}`,
        { entryId: result.id, entryNumber: result.entryNumber }
      );

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

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
      await auditService.logAction(
        userId,
        'posting:postPeriod',
        'PostingBatch',
        result.id!,
        `Posted batch #${result.id} (${result.periodType})`,
        {
          periodType: result.periodType,
          periodStart: result.periodStart,
          periodEnd: result.periodEnd,
          entriesCount: result.entriesCount,
          totalAmount: result.totalAmount,
          status: result.status,
        }
      );

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

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;
      const originalEntry = await reverseEntryUseCase.getValidatedOriginalEntry(data.entryId);

      const result = withTransaction(db.sqlite, () => {
        return reverseEntryUseCase.executeCommitPhase(originalEntry, userId);
      });
      await auditService.logAction(
        userId,
        'posting:reverseEntry',
        'JournalEntry',
        data.entryId,
        `Reversed journal entry #${data.entryId}`,
        {
          originalEntryId: data.entryId,
          reversalEntryId: result.id,
        }
      );

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

      const entryIds = postingRepo.getPostedEntryIdsByBatch(data.batchId);
      if (entryIds.length === 0) {
        throw buildValidationError(
          'posting:reverseBatch',
          payload,
          `No posted entries found for batch ${data.batchId}`
        );
      }

      const originals: any[] = [];
      for (const entryId of entryIds) {
        originals.push(await reverseEntryUseCase.getValidatedOriginalEntry(entryId));
      }

      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;
      const reversedEntries = withTransaction(db.sqlite, () => {
        return originals.map((entry) => reverseEntryUseCase.executeCommitPhase(entry, userId));
      });
      await auditService.logAction(
        userId,
        'posting:reverseBatch',
        'PostingBatch',
        data.batchId,
        `Reversed ${reversedEntries.length} entries in posting batch #${data.batchId}`,
        {
          batchId: data.batchId,
          reversedCount: reversedEntries.length,
          reversedEntryIds: reversedEntries.map((entry) => entry.id),
        }
      );

      return ok({
        batchId: data.batchId,
        reversedCount: reversedEntries.length,
        entries: reversedEntries,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Lock a posting batch to prevent reversals and amendments.
   */
  ipcMain.handle('posting:lockBatch', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin'] });

      const body = assertPayload('posting:lockBatch', payload, ['data']);
      const data = body.data as { batchId?: number };
      if (!data?.batchId || typeof data.batchId !== 'number') {
        throw buildValidationError('posting:lockBatch', payload, 'batchId (number) is required');
      }
      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;

      withTransaction(db.sqlite, () => {
        postingRepo.lockBatch(data.batchId!);
        return true;
      });
      await auditService.logAction(
        userId,
        'posting:lockBatch',
        'PostingBatch',
        data.batchId,
        `Locked posting batch #${data.batchId}`,
        { batchId: data.batchId }
      );

      return ok({ ok: true as const });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Unlock posting batch - disabled by default in ERP mode.
   */
  ipcMain.handle('posting:unlockBatch', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:write', allowRoles: ['admin'] });

      const body = assertPayload('posting:unlockBatch', payload, ['data']);
      const data = body.data as { batchId?: number };
      if (!data?.batchId || typeof data.batchId !== 'number') {
        throw buildValidationError('posting:unlockBatch', payload, 'batchId (number) is required');
      }

      if (!isPostingUnlockEnabled()) {
        throw buildValidationError(
          'posting:unlockBatch',
          payload,
          'Unlocking posting batches is disabled by policy'
        );
      }

      withTransaction(db.sqlite, () => {
        postingRepo.unlockBatch(data.batchId!);
        return true;
      });
      const ctx = userContextService.getContext();
      const userId = ctx?.userId || 1;
      await auditService.logAction(
        userId,
        'posting:unlockBatch',
        'PostingBatch',
        data.batchId,
        `Unlocked posting batch #${data.batchId}`,
        { batchId: data.batchId }
      );

      return ok({ ok: true as const });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Check whether a posting batch is locked.
   */
  ipcMain.handle('posting:isBatchLocked', async (_event, payload) => {
    try {
      requirePermission({ permission: 'accounting:read', allowRoles: ['admin', 'manager'] });

      const body = assertPayload('posting:isBatchLocked', payload, ['data']);
      const data = body.data as { batchId?: number };
      if (!data?.batchId || typeof data.batchId !== 'number') {
        throw buildValidationError(
          'posting:isBatchLocked',
          payload,
          'batchId (number) is required'
        );
      }

      return ok({ locked: postingRepo.isBatchLocked(data.batchId) });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
