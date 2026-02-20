import { ipcMain } from 'electron';
import {
  GetCustomersUseCase,
  CreateCustomerUseCase,
  UpdateCustomerUseCase,
  DeleteCustomerUseCase,
} from '@nuqtaplus/core';
import { SqliteCustomerRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerCustomerHandlers(db: DatabaseType) {
  const customerRepo = new SqliteCustomerRepository(db.db);
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
      return ok(await getCustomersUseCase.execute(params as any));
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('customers:getById', async (_event, payload) => {
    try {
      requirePermission({ permission: 'customers:read' });

      const { id } = assertPayload('customers:getById', payload, ['id']);
      const customerId = Number(id);
      if (!Number.isFinite(customerId)) {
        throw buildValidationError('customers:getById', payload, 'id must be a number');
      }

      const customer = customerRepo.findById(customerId);
      return ok(customer);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('customers:create', async (_event, params) => {
    try {
      requirePermission({ permission: 'customers:create' });

      const payload = assertPayload('customers:create', params, ['data']);
      validateCreateCustomerPayload('customers:create', payload);

      const result = await createCustomerUseCase.execute(payload.data as any);

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('customers:update', async (_event, params) => {
    try {
      requirePermission({ permission: 'customers:update' });

      const payload = assertPayload('customers:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('customers:update', payload, 'ID must be a number');
      }
      validateUpdateCustomerPayload('customers:update', payload);

      const result = await updateCustomerUseCase.execute(payload.id as number, payload.data as any);

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('customers:delete', async (_event, params) => {
    try {
      requirePermission({ permission: 'customers:delete' });

      const payload = assertPayload('customers:delete', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('customers:delete', payload, 'ID must be a number');
      }

      await deleteCustomerUseCase.execute(payload.id as number);

      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
