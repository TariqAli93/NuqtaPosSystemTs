import { ipcMain } from 'electron';
import {
  GetCustomersUseCase,
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
} from '@nuqtaplus/core';
import { SqliteCustomerRepository, SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerCustomerHandlers(db: DatabaseType) {
  const customerRepo = new SqliteCustomerRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);
  const getCustomersUseCase = new GetCustomersUseCase(customerRepo);
  const createCustomerUseCase = new CreateCustomerUseCase(customerRepo);
  const updateCustomerUseCase = new UpdateCustomerUseCase(customerRepo);
  const deleteCustomerUseCase = new DeleteCustomerUseCase(customerRepo);

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for customers:create
   */
  function validateCreateCustomerPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate required name
    if (!data.name || typeof data.name !== 'string') {
      throw buildValidationError(channel, payload, 'Customer name must be a string');
    }

    // Validate required phone
    if (data.phone !== undefined && data.phone !== null) {
      if (typeof data.phone !== 'string') {
        throw buildValidationError(channel, payload, 'Phone must be a string if provided');
      }
      if (data.phone.trim().length > 0 && !/^[0-9+\-\s()]+$/.test(data.phone)) {
        throw buildValidationError(channel, payload, 'Phone contains invalid characters');
      }
    }

    if (data.type && !['retail', 'wholesale'].includes(data.type)) {
      throw buildValidationError(channel, payload, 'Type must be retail or wholesale if provided');
    }

    // Validate optional address
    if (data.address && typeof data.address !== 'string') {
      throw buildValidationError(channel, payload, 'Address must be a string if provided');
    }

    // Validate optional city
    if (data.city && typeof data.city !== 'string') {
      throw buildValidationError(channel, payload, 'City must be a string if provided');
    }
  }

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for customers:update
   */
  function validateUpdateCustomerPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate name if provided
    if (data.name && typeof data.name !== 'string') {
      throw buildValidationError(channel, payload, 'Customer name must be a string if provided');
    }

    // Validate phone if provided
    if (data.phone) {
      if (typeof data.phone !== 'string') {
        throw buildValidationError(channel, payload, 'Phone must be a string if provided');
      }
      if (data.phone.trim().length > 0 && !/^[0-9+\-\s()]+$/.test(data.phone)) {
        throw buildValidationError(channel, payload, 'Phone contains invalid characters');
      }
    }

    // Validate type if provided
    if (data.type && !['retail', 'wholesale'].includes(data.type)) {
      throw buildValidationError(channel, payload, 'Type must be retail or wholesale if provided');
    }

    // Validate address if provided
    if (data.address && typeof data.address !== 'string') {
      throw buildValidationError(channel, payload, 'Address must be a string if provided');
    }

    // Validate city if provided
    if (data.city && typeof data.city !== 'string') {
      throw buildValidationError(channel, payload, 'City must be a string if provided');
    }
  }

  ipcMain.handle('customers:getAll', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'customers:read' });

      const { params } = assertPayload('customers:getAll', payload, ['params']);
      return await getCustomersUseCase.execute(params);
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operation in a transaction for atomicity
   */
  ipcMain.handle('customers:create', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'customers:create' });

      const payload = assertPayload('customers:create', params, ['data']);
      validateCreateCustomerPayload('customers:create', payload);

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return createCustomerUseCase.execute(payload.data);
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
  ipcMain.handle('customers:update', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'customers:update' });

      const payload = assertPayload('customers:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('customers:update', payload, 'ID must be a number');
      }
      validateUpdateCustomerPayload('customers:update', payload);

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return updateCustomerUseCase.execute(payload.id, payload.data);
      });

      return result;
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('customers:delete', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'customers:delete' });

      const payload = assertPayload('customers:delete', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('customers:delete', payload, 'ID must be a number');
      }

      const userId = userContextService.getUserId() || 1;

      // Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return deleteCustomerUseCase.execute(payload.id);
      });

      return result;
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });
}
