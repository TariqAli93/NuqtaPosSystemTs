import { ipcMain } from 'electron';
import { CreateSaleUseCase, mapErrorToResult, ok, AddPaymentUseCase } from '@nuqtaplus/core';
import {
  SqliteSaleRepository,
  SqliteProductRepository,
  SqliteCustomerRepository,
  SqliteSettingsRepository,
  SqlitePaymentRepository,
  SqliteAuditRepository,
  withTransaction,
  DatabaseType,
} from '@nuqtaplus/data';

import { userContextService } from '../services/UserContextService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerSaleHandlers(db: DatabaseType) {
  const saleRepo = new SqliteSaleRepository(db.db);
  const productRepo = new SqliteProductRepository(db.db);
  const customerRepo = new SqliteCustomerRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const paymentRepo = new SqlitePaymentRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);

  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo,
    auditRepo
  );

  const addPaymentUseCase = new AddPaymentUseCase(saleRepo, paymentRepo, customerRepo);

  /**
   * Validates CreateSaleInput DTO (flat, no wrapper keys).
   * Payload shape: { data: CreateSaleInput }
   */
  function validateCreateSalePayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate items
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw buildValidationError(channel, payload, 'Items must be a non-empty array');
    }

    for (const item of data.items) {
      if (typeof item.productId !== 'number') {
        throw buildValidationError(channel, payload, 'Each item must have a numeric productId');
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw buildValidationError(channel, payload, 'Each item must have a positive quantity');
      }
    }

    // Validate currency if provided
    if (data.currency && typeof data.currency !== 'string') {
      throw buildValidationError(channel, payload, 'Currency must be a string');
    }

    // Validate payment type if provided
    if (data.paymentType && !['cash', 'installment', 'mixed'].includes(data.paymentType)) {
      throw buildValidationError(
        channel,
        payload,
        'Payment type must be cash, installment, or mixed'
      );
    }

    // Validate customer ID if installment payment
    if (data.paymentType === 'installment' && !data.customerId) {
      throw buildValidationError(
        channel,
        payload,
        'Customer ID is required for installment payments'
      );
    }
  }

  /**
   * Validates AddPaymentInput DTO (flat, no wrapper keys).
   * Payload shape: { data: AddPaymentInput }
   */
  function validateAddPaymentPayload(channel: string, payload: any): void {
    const data = payload.data;

    if (typeof data.saleId !== 'number') {
      throw buildValidationError(channel, payload, 'Sale ID must be a number');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw buildValidationError(channel, payload, 'Amount must be a positive number');
    }

    if (data.paymentMethod && !['cash', 'card', 'bank_transfer'].includes(data.paymentMethod)) {
      throw buildValidationError(
        channel,
        payload,
        'Payment method must be cash, card, or bank_transfer'
      );
    }
  }

  ipcMain.handle('sales:create', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:create' });

      const payload = assertPayload('sales:create', params, ['data']);
      validateCreateSalePayload('sales:create', payload);

      // DTO is directly at payload.data — no extra nesting
      const saleInput = payload.data as any;

      // userId comes from UserContextService, NOT from UI payload
      const userId = userContextService.getUserId() || 1;

      const commitResult = withTransaction(db.sqlite, () => {
        return createSaleUseCase.executeCommitPhase(saleInput, userId);
      });
      await createSaleUseCase.executeSideEffectsPhase(commitResult);

      return ok(commitResult.createdSale);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:addPayment', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:addPayment' });

      const payload = assertPayload('sales:addPayment', params, ['data']);
      validateAddPaymentPayload('sales:addPayment', payload);

      // DTO is directly at payload.data (flat AddPaymentInput)
      const paymentInput = payload.data as any;
      const userId = userContextService.getUserId() || 1;

      const commitResult = withTransaction(db.sqlite, () => {
        return addPaymentUseCase.executeCommitPhase(paymentInput, userId);
      });

      return ok(commitResult.updatedSale);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:getById', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:read' });

      const payload = assertPayload('sales:getById', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:getById', payload, 'ID must be a number');
      }

      const sale = saleRepo.findById(payload.id);
      return ok(sale);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:getAll', async (_event, payload) => {
    try {
      requirePermission({ permission: 'sales:read' });

      const { params } = assertPayload('sales:getAll', payload, ['params']);
      const rawParams = (params || {}) as Record<string, any>;
      const safeParams = {
        page: typeof rawParams.page === 'number' ? rawParams.page : Number(rawParams.page) || 1,
        limit:
          typeof rawParams.limit === 'number' ? rawParams.limit : Number(rawParams.limit) || 10,
        startDate: rawParams.startDate,
        endDate: rawParams.endDate,
        status: rawParams.status,
        customer: rawParams.customer,
      };
      const result = saleRepo.findAll(safeParams);
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:cancel', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:cancel' });

      const payload = assertPayload('sales:cancel', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:cancel', payload, 'ID must be a number');
      }
      saleRepo.updateStatus(payload.id, 'cancelled');
      return ok(null);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:refund', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:refund' });
      const payload = assertPayload('sales:refund', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:refund', payload, 'ID must be a number');
      }
      saleRepo.updateStatus(payload.id, 'completed');
      return ok(null);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('sales:generateReceipt', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:read' });
      const payload = assertPayload('sales:generateReceipt', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:generateReceipt', payload, 'ID must be a number');
      }
      const receiptHtml = saleRepo.generateReceipt(payload.id);
      return ok({ receiptHtml });
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });
}
