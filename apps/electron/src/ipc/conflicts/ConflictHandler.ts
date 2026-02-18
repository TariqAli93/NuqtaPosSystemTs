import { ipcMain } from 'electron';
import type { DatabaseType } from '@nuqtaplus/data';
import {
  GetConflictsUseCase,
  ResolveConflictUseCase,
  GetConflictStatsUseCase,
} from '@nuqtaplus/core';
import type { IConflictRepository } from '@nuqtaplus/core';
import { assertPayload, buildValidationError } from '../../services/IpcPayloadValidator.js';
import { ok, mapErrorToIpcResponse } from '../../services/IpcErrorMapperService.js';

/**
 * Conflict Handler
 *
 * Registers IPC handlers for conflict resolution operations.
 * Bridges Electron main process with conflict use cases.
 */
export function registerConflictHandlers(
  db: DatabaseType,
  conflictRepository: IConflictRepository
) {
  /**
   * conflicts:getList
   * Get list of conflicts with optional filtering
   */
  ipcMain.handle('conflicts:getList', async (_event, payload: any) => {
    try {
      const useCase = new GetConflictsUseCase(conflictRepository);
      const parsed = assertPayload('conflicts:getList', payload, ['params']);
      const params = (parsed.params || {}) as Record<string, unknown>;
      const status =
        params.status === 'pending' || params.status === 'resolved' ? params.status : undefined;
      const result = await useCase.execute({
        status,
        entityType: typeof params.entityType === 'string' ? params.entityType : undefined,
        deviceId: typeof params.deviceId === 'string' ? params.deviceId : undefined,
        limit: typeof params.limit === 'number' ? params.limit : undefined,
        offset: typeof params.offset === 'number' ? params.offset : undefined,
      });
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * conflicts:getDetail
   * Get detailed information about a specific conflict
   */
  ipcMain.handle('conflicts:getDetail', async (_event, payload: any) => {
    try {
      const { id } = assertPayload('conflicts:getDetail', payload, ['id']);
      const conflictId = Number(id);
      if (!Number.isFinite(conflictId)) {
        throw buildValidationError('conflicts:getDetail', payload, 'Conflict ID is required');
      }
      const conflict = await conflictRepository.getConflictById(conflictId);
      if (!conflict) {
        throw buildValidationError('conflicts:getDetail', payload, `Conflict not found: ${conflictId}`);
      }
      return ok(conflict);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * conflicts:resolve
   * Resolve a single conflict
   */
  ipcMain.handle('conflicts:resolve', async (_event, payload: any) => {
    try {
      const useCase = new ResolveConflictUseCase(conflictRepository);
      const parsed = assertPayload('conflicts:resolve', payload, ['data']);
      const data = (parsed.data || {}) as Record<string, unknown>;
      if (typeof data.conflictId !== 'number') {
        throw buildValidationError('conflicts:resolve', payload, 'conflictId must be a number');
      }
      if (
        data.strategy !== 'lww' &&
        data.strategy !== 'manual' &&
        data.strategy !== 'merge' &&
        data.strategy !== 'custom-rule' &&
        data.strategy !== 'auto'
      ) {
        throw buildValidationError('conflicts:resolve', payload, 'strategy is invalid');
      }
      const strategy = data.strategy;
      const result = await useCase.execute({
        conflictId: data.conflictId,
        strategy,
        resolvedValue:
          data.resolvedValue &&
          typeof data.resolvedValue === 'object' &&
          !Array.isArray(data.resolvedValue)
            ? (data.resolvedValue as Record<string, any>)
            : undefined,
        feedback: typeof data.feedback === 'string' ? data.feedback : undefined,
        resolvedBy: typeof data.resolvedBy === 'number' ? data.resolvedBy : 1,
      });
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * conflicts:getStats
   * Get conflict statistics
   */
  ipcMain.handle('conflicts:getStats', async (_event, payload: any) => {
    try {
      const useCase = new GetConflictStatsUseCase(conflictRepository);
      const parsed = assertPayload('conflicts:getStats', payload, ['params']);
      const params = (parsed.params || {}) as Record<string, unknown>;
      const result = await useCase.execute({
        fromDate: typeof params.fromDate === 'number' ? params.fromDate : undefined,
        toDate: typeof params.toDate === 'number' ? params.toDate : undefined,
      });
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
