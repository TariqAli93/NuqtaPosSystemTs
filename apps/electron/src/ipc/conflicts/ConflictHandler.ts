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
      const { params } = assertPayload('conflicts:getList', payload, ['params']);
      const result = await useCase.execute({
        status: params.status,
        entityType: params.entityType,
        deviceId: params.deviceId,
        limit: params.limit,
        offset: params.offset,
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
      if (!id) {
        throw buildValidationError('conflicts:getDetail', payload, 'Conflict ID is required');
      }
      const conflict = await conflictRepository.getConflictById(id);
      if (!conflict) {
        throw buildValidationError('conflicts:getDetail', payload, `Conflict not found: ${id}`);
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
      const { data } = assertPayload('conflicts:resolve', payload, ['data']);
      const result = await useCase.execute({
        conflictId: data.conflictId,
        strategy: data.strategy,
        resolvedValue: data.resolvedValue,
        feedback: data.feedback,
        resolvedBy: data.resolvedBy,
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
      const { params } = assertPayload('conflicts:getStats', payload, ['params']);
      const result = await useCase.execute({
        fromDate: params.fromDate,
        toDate: params.toDate,
      });
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
