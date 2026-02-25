import { ipcMain } from 'electron';
import {
  DatabaseType,
  SqliteCustomerLedgerRepository,
  SqliteCustomerRepository,
  SqlitePaymentRepository,
  SqliteAccountingRepository,
  SqliteAuditRepository,
  withTransaction,
} from '@nuqtaplus/data';
import {
  GetCustomerLedgerUseCase,
  RecordCustomerPaymentUseCase,
  AddCustomerLedgerAdjustmentUseCase,
  ReconcileCustomerDebtUseCase,
} from '@nuqtaplus/core';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { userContextService } from '../services/UserContextService.js';

export function registerCustomerLedgerHandlers(db: DatabaseType) {
  const ledgerRepo = new SqliteCustomerLedgerRepository(db.db);
  const customerRepo = new SqliteCustomerRepository(db.db);
  const paymentRepo = new SqlitePaymentRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);

  const getLedgerUseCase = new GetCustomerLedgerUseCase(ledgerRepo);
  const recordPaymentUseCase = new RecordCustomerPaymentUseCase(
    ledgerRepo,
    customerRepo,
    paymentRepo,
    accountingRepo,
    auditRepo
  );
  const addAdjustmentUseCase = new AddCustomerLedgerAdjustmentUseCase(
    ledgerRepo,
    customerRepo,
    auditRepo
  );
  const reconcileDebtUseCase = new ReconcileCustomerDebtUseCase(customerRepo, ledgerRepo);

  ipcMain.handle('customerLedger:getLedger', async (_, payload) => {
    try {
      const parsed = assertPayload('customerLedger:getLedger', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params)
          ? (parsed.params as Record<string, unknown>)
          : {};

      const customerId = Number(params.customerId);
      if (!Number.isFinite(customerId)) {
        throw buildValidationError('customerLedger:getLedger', payload, 'customerId must be number');
      }
      const result = await getLedgerUseCase.execute({
        customerId,
        dateFrom: typeof params.dateFrom === 'string' ? params.dateFrom : undefined,
        dateTo: typeof params.dateTo === 'string' ? params.dateTo : undefined,
        limit: typeof params.limit === 'number' ? params.limit : undefined,
        offset: typeof params.offset === 'number' ? params.offset : undefined,
      });
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('customerLedger:recordPayment', async (_, payload) => {
    try {
      const parsed = assertPayload('customerLedger:recordPayment', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : {};
      if (data.customerId === undefined || data.amount === undefined || data.paymentMethod === undefined) {
        throw buildValidationError(
          'customerLedger:recordPayment',
          payload,
          'customerId, amount, paymentMethod are required'
        );
      }
      const userId = userContextService.getUserId() || 1;
      const customerId = Number(data.customerId);
      const amount = Number(data.amount);
      if (!Number.isFinite(customerId) || !Number.isFinite(amount)) {
        throw buildValidationError(
          'customerLedger:recordPayment',
          payload,
          'customerId and amount must be numbers'
        );
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        throw buildValidationError(
          'customerLedger:recordPayment',
          payload,
          'amount must be a positive integer IQD value'
        );
      }
      const result = withTransaction(db.sqlite, () =>
        recordPaymentUseCase.executeCommitPhase({
          customerId,
          amount,
          paymentMethod: String(data.paymentMethod),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
        }, userId)
      );
      await recordPaymentUseCase.executeSideEffectsPhase(
        result,
        {
          customerId,
          amount,
          paymentMethod: String(data.paymentMethod),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
        },
        userId
      );
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('customerLedger:addAdjustment', async (_, payload) => {
    try {
      const parsed = assertPayload('customerLedger:addAdjustment', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
          ? (parsed.data as Record<string, unknown>)
          : {};
      if (data.customerId === undefined || data.amount === undefined) {
        throw buildValidationError(
          'customerLedger:addAdjustment',
          payload,
          'customerId and amount are required'
        );
      }
      const customerId = Number(data.customerId);
      const amount = Number(data.amount);
      if (!Number.isFinite(customerId) || !Number.isFinite(amount)) {
        throw buildValidationError(
          'customerLedger:addAdjustment',
          payload,
          'customerId and amount must be numbers'
        );
      }
      if (!Number.isInteger(amount)) {
        throw buildValidationError(
          'customerLedger:addAdjustment',
          payload,
          'amount must be an integer IQD value'
        );
      }
      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () =>
        addAdjustmentUseCase.executeCommitPhase(
          {
            customerId,
            amount,
            notes: typeof data.notes === 'string' ? data.notes : undefined,
          },
          userId
        )
      );
      await addAdjustmentUseCase.executeSideEffectsPhase(
        result,
        {
          customerId,
          amount,
          notes: typeof data.notes === 'string' ? data.notes : undefined,
        },
        userId
      );
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('customerLedger:reconcileDebt', async (_, payload) => {
    try {
      const parsed = assertPayload('customerLedger:reconcileDebt', payload, ['params']);
      const repair = Boolean((parsed.params as any)?.repair);
      const report = reconcileDebtUseCase.execute();
      const repairedCount = repair ? reconcileDebtUseCase.repair() : 0;
      return ok({ ...report, repairedCount });
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });
}
