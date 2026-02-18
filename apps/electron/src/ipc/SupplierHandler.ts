import { ipcMain } from 'electron';
import {
  CreateSupplierUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase,
  GetSuppliersUseCase,
  GetSupplierByIdUseCase,
} from '@nuqtaplus/core';
import { SqliteSupplierRepository, DatabaseType } from '@nuqtaplus/data';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

export function registerSupplierHandlers(db: DatabaseType) {
  const repository = new SqliteSupplierRepository(db.db);
  const createUseCase = new CreateSupplierUseCase(repository);
  const updateUseCase = new UpdateSupplierUseCase(repository);
  const deleteUseCase = new DeleteSupplierUseCase(repository);
  const getAllUseCase = new GetSuppliersUseCase(repository);
  const getByIdUseCase = new GetSupplierByIdUseCase(repository);

  ipcMain.handle('suppliers:create', async (_, payload) => {
    try {
      const { data } = assertPayload('suppliers:create', payload, ['data']);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw buildValidationError('suppliers:create', payload, 'data must be an object');
      }
      const result = await createUseCase.execute(data as any);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('suppliers:update', async (_, payload) => {
    try {
      const { id, data } = assertPayload('suppliers:update', payload, ['id', 'data']);
      const supplierId = Number(id);
      if (!Number.isFinite(supplierId)) {
        throw buildValidationError('suppliers:update', payload, 'id must be number');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw buildValidationError('suppliers:update', payload, 'data must be an object');
      }
      const result = await updateUseCase.execute(supplierId, data as any);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('suppliers:delete', async (_, payload) => {
    try {
      const { id } = assertPayload('suppliers:delete', payload, ['id']);
      const supplierId = Number(id);
      if (!Number.isFinite(supplierId)) {
        throw buildValidationError('suppliers:delete', payload, 'id must be number');
      }
      await deleteUseCase.execute(supplierId);
      return ok({ ok: true });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('suppliers:getAll', async (_, payload) => {
    try {
      const parsed = assertPayload('suppliers:getAll', payload, ['params']);
      const result = await getAllUseCase.execute((parsed.params || {}) as any);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('suppliers:getById', async (_, payload) => {
    try {
      const { id } = assertPayload('suppliers:getById', payload, ['id']);
      const supplierId = Number(id);
      if (!Number.isFinite(supplierId)) {
        throw buildValidationError('suppliers:getById', payload, 'id must be number');
      }
      const result = await getByIdUseCase.execute(supplierId);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
