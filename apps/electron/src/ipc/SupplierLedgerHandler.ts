import { ipcMain } from 'electron';
import {
  DatabaseType,
  SqliteSupplierLedgerRepository,
  SqliteSupplierRepository,
  SqlitePaymentRepository,
  SqliteAccountingRepository,
  SqliteAuditRepository,
  withTransaction,
} from '@nuqtaplus/data';
import {
  GetSupplierLedgerUseCase,
  RecordSupplierPaymentUseCase,
  ReconcileSupplierBalanceUseCase,
} from '@nuqtaplus/core';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { userContextService } from '../services/UserContextService.js';

export function registerSupplierLedgerHandlers(db: DatabaseType) {
  const ledgerRepo = new SqliteSupplierLedgerRepository(db.db);
  const supplierRepo = new SqliteSupplierRepository(db.db);
  const paymentRepo = new SqlitePaymentRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);

  const getLedgerUseCase = new GetSupplierLedgerUseCase(ledgerRepo);
  const recordPaymentUseCase = new RecordSupplierPaymentUseCase(
    ledgerRepo,
    supplierRepo,
    paymentRepo,
    accountingRepo,
    auditRepo
  );
  const reconcileBalanceUseCase = new ReconcileSupplierBalanceUseCase(
    supplierRepo,
    ledgerRepo
  );

  ipcMain.handle('supplierLedger:getLedger', async (_, payload) => {
    try {
      const parsed = assertPayload('supplierLedger:getLedger', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params)
          ? (parsed.params as Record<string, unknown>)
          : {};

      const supplierId = Number(params.supplierId);
      if (!Number.isFinite(supplierId)) {
        throw buildValidationError('supplierLedger:getLedger', payload, 'supplierId must be number');
      }
      const result = await getLedgerUseCase.execute({
        supplierId,
        dateFrom: typeof params.dateFrom === 'string' ? params.dateFrom : undefined,
        dateTo: typeof params.dateTo === 'string' ? params.dateTo : undefined,
        limit: typeof params.limit === 'number' ? params.limit : undefined,
        offset: typeof params.offset === 'number' ? params.offset : undefined,
      });
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('supplierLedger:recordPayment', async (_, payload) => {
    try {
      const parsed = assertPayload('supplierLedger:recordPayment', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : {};
      if (data.supplierId === undefined || data.amount === undefined || data.paymentMethod === undefined) {
        throw buildValidationError(
          'supplierLedger:recordPayment',
          payload,
          'supplierId, amount, paymentMethod are required'
        );
      }
      const supplierId = Number(data.supplierId);
      const amount = Number(data.amount);
      if (!Number.isFinite(supplierId) || !Number.isFinite(amount)) {
        throw buildValidationError(
          'supplierLedger:recordPayment',
          payload,
          'supplierId and amount must be numbers'
        );
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        throw buildValidationError(
          'supplierLedger:recordPayment',
          payload,
          'amount must be a positive integer IQD value'
        );
      }
      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () =>
        recordPaymentUseCase.executeCommitPhase({
          supplierId,
          amount,
          paymentMethod: String(data.paymentMethod),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
        }, userId)
      );
      await recordPaymentUseCase.executeSideEffectsPhase(
        result,
        {
          supplierId,
          amount,
          paymentMethod: String(data.paymentMethod),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
        },
        userId
      );
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('supplierLedger:reconcileBalance', async (_, payload) => {
    try {
      const parsed = assertPayload('supplierLedger:reconcileBalance', payload, ['params']);
      const repair = Boolean((parsed.params as any)?.repair);
      const report = await reconcileBalanceUseCase.execute();
      const repairedCount = repair ? await reconcileBalanceUseCase.repair() : 0;
      return ok({ ...report, repairedCount });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
