import { ipcMain } from 'electron';
import {
  CreatePurchaseUseCase,
  GetPurchasesUseCase,
  GetPurchaseByIdUseCase,
} from '@nuqtaplus/core';
import {
  SqlitePurchaseRepository,
  SqliteSupplierRepository,
  SqlitePaymentRepository,
  SqliteSupplierLedgerRepository,
  SqliteAccountingRepository,
  SqliteSettingsRepository,
  withTransaction,
  DatabaseType,
} from '@nuqtaplus/data';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { userContextService } from '../services/UserContextService.js';

export function registerPurchaseHandlers(db: DatabaseType) {
  const purchaseRepo = new SqlitePurchaseRepository(db.db);
  const supplierRepo = new SqliteSupplierRepository(db.db);
  const paymentRepo = new SqlitePaymentRepository(db.db);
  const supplierLedgerRepo = new SqliteSupplierLedgerRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);

  const createUseCase = new CreatePurchaseUseCase(
    purchaseRepo,
    supplierRepo,
    paymentRepo,
    supplierLedgerRepo,
    accountingRepo,
    settingsRepo
  );
  const getAllUseCase = new GetPurchasesUseCase(purchaseRepo);
  const getByIdUseCase = new GetPurchaseByIdUseCase(purchaseRepo);

  ipcMain.handle('purchases:create', async (_, payload) => {
    try {
      const { data } = assertPayload('purchases:create', payload, ['data']);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw buildValidationError('purchases:create', payload, 'data must be an object');
      }

      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () => createUseCase.executeCommitPhase(data as any, userId));

      return ok(result.createdPurchase);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('purchases:getAll', async (_, payload) => {
    try {
      const parsed = assertPayload('purchases:getAll', payload, ['params']);
      const result = await getAllUseCase.execute((parsed.params || {}) as any);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('purchases:getById', async (_, payload) => {
    try {
      const { id } = assertPayload('purchases:getById', payload, ['id']);
      const purchaseId = Number(id);
      if (!Number.isFinite(purchaseId)) {
        throw buildValidationError('purchases:getById', payload, 'id must be a number');
      }
      const result = await getByIdUseCase.execute(purchaseId);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
