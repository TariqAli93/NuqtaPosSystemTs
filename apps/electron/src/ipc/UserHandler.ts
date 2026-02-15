import { ipcMain } from 'electron';
import { GetUsersUseCase, CreateUserUseCase, UpdateUserUseCase } from '@nuqtaplus/core';
import { SqliteUserRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerUserHandlers(db: DatabaseType) {
  const userRepo = new SqliteUserRepository(db.db);
  const getUsersUseCase = new GetUsersUseCase(userRepo);
  const createUserUseCase = new CreateUserUseCase(userRepo);
  const updateUserUseCase = new UpdateUserUseCase(userRepo);

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for users:create
   */
  function validateCreateUserPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate required username
    if (!data.username || typeof data.username !== 'string' || data.username.length < 3) {
      throw buildValidationError(channel, payload, 'Username must be a string with min length 3');
    }

    // Validate username format (alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      throw buildValidationError(
        channel,
        payload,
        'Username must contain only alphanumeric and underscore characters'
      );
    }

    // Validate required password (for create only)
    if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
      throw buildValidationError(channel, payload, 'Password must be a string with min length 8');
    }

    // Validate required role
    if (!data.role || !['admin', 'manager', 'cashier', 'viewer'].includes(data.role)) {
      throw buildValidationError(
        channel,
        payload,
        'Role must be admin, manager, cashier, or viewer'
      );
    }
  }

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for users:update
   */
  function validateUpdateUserPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate username if provided
    if (data.username) {
      if (typeof data.username !== 'string' || data.username.length < 3) {
        throw buildValidationError(
          channel,
          payload,
          'Username must be a string with min length 3 if provided'
        );
      }
      if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        throw buildValidationError(
          channel,
          payload,
          'Username must contain only alphanumeric and underscore characters'
        );
      }
    }

    // Validate password if provided (for update, can be optional)
    if (data.password) {
      if (typeof data.password !== 'string' || data.password.length < 8) {
        throw buildValidationError(
          channel,
          payload,
          'Password must be a string with min length 8 if provided'
        );
      }
    }

    // Validate role if provided
    if (data.role && !['admin', 'manager', 'cashier', 'viewer'].includes(data.role)) {
      throw buildValidationError(
        channel,
        payload,
        'Role must be admin, manager, cashier, or viewer if provided'
      );
    }
  }

  ipcMain.handle('users:getAll', async (_event, payload) => {
    try {
      // Check permission (read access - admin only)
      requirePermission({ permission: 'users:read' });

      assertPayload('users:getAll', payload, ['params']);
      return ok(await getUsersUseCase.execute());
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('users:create', async (_event, params) => {
    try {
      // Check permission (admin only)
      requirePermission({ permission: 'users:create' });

      const payload = assertPayload('users:create', params, ['data']);
      validateCreateUserPayload('users:create', payload);
      const data = payload.data as any;

      const result = await createUserUseCase.execute(data);

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('users:update', async (_event, params) => {
    try {
      // Check permission (admin only)
      requirePermission({ permission: 'users:update' });

      const payload = assertPayload('users:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('users:update', payload, 'ID must be a number');
      }
      validateUpdateUserPayload('users:update', payload);
      const data = payload.data as any;
      const id = payload.id as number;

      const result = await updateUserUseCase.execute(id, data);

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
