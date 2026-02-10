import { ipcMain } from 'electron';
import {
  GetCategoriesUseCase,
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from '@nuqtaplus/core';
import { SqliteCategoryRepository, SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerCategoryHandlers(db: DatabaseType) {
  const categoryRepo = new SqliteCategoryRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);
  const getCategoriesUseCase = new GetCategoriesUseCase(categoryRepo);
  const createCategoryUseCase = new CreateCategoryUseCase(categoryRepo);
  const updateCategoryUseCase = new UpdateCategoryUseCase(categoryRepo);
  const deleteCategoryUseCase = new DeleteCategoryUseCase(categoryRepo);

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for categories:create
   */
  function validateCreateCategoryPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate required name
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1) {
      throw buildValidationError(channel, payload, 'Category name must be a non-empty string');
    }

    // Validate optional description
    if (data.description && typeof data.description !== 'string') {
      throw buildValidationError(channel, payload, 'Description must be a string if provided');
    }

    // Validate optional color (hex format)
    if (data.color) {
      if (typeof data.color !== 'string') {
        throw buildValidationError(channel, payload, 'Color must be a string if provided');
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        throw buildValidationError(channel, payload, 'Color must be valid hex format (#RRGGBB)');
      }
    }
  }

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for categories:update
   */
  function validateUpdateCategoryPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate name if provided
    if (data.name) {
      if (typeof data.name !== 'string' || data.name.length < 1) {
        throw buildValidationError(channel, payload, 'Category name must be a non-empty string');
      }
    }

    // Validate description if provided
    if (data.description && typeof data.description !== 'string') {
      throw buildValidationError(channel, payload, 'Description must be a string if provided');
    }

    // Validate color if provided (hex format)
    if (data.color) {
      if (typeof data.color !== 'string') {
        throw buildValidationError(channel, payload, 'Color must be a string if provided');
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        throw buildValidationError(channel, payload, 'Color must be valid hex format (#RRGGBB)');
      }
    }
  }

  ipcMain.handle('categories:getAll', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'categories:read' });

      assertPayload('categories:getAll', payload, ['params']);
      return await getCategoriesUseCase.execute();
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operation in a transaction for atomicity
   */
  ipcMain.handle('categories:create', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'categories:create' });

      const payload = assertPayload('categories:create', params, ['data']);
      validateCreateCategoryPayload('categories:create', payload);
      const data = payload.data as any;

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return createCategoryUseCase.execute(data);
      });

      return result;
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operation in a transaction for atomicity
   */
  ipcMain.handle('categories:update', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'categories:update' });

      const payload = assertPayload('categories:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('categories:update', payload, 'ID must be a number');
      }
      validateUpdateCategoryPayload('categories:update', payload);
      const data = payload.data as any;
      const id = payload.id as number;

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return updateCategoryUseCase.execute(id, data);
      });

      return result;
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('categories:delete', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'categories:delete' });

      const payload = assertPayload('categories:delete', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('categories:delete', payload, 'ID must be a number');
      }

      const userId = userContextService.getUserId() || 1;

      // Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return deleteCategoryUseCase.execute(payload.id as number);
      });

      return result;
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });
}
