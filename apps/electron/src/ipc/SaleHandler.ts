import { ipcMain } from 'electron';
import { CreateSaleUseCase } from '@nuqtaplus/core';
import { AddPaymentUseCase } from '@nuqtaplus/core';
import { SqliteSaleRepository } from '@nuqtaplus/data';
import { SqliteProductRepository } from '@nuqtaplus/data';
import { SqliteCustomerRepository } from '@nuqtaplus/data';
import { SqliteSettingsRepository } from '@nuqtaplus/data';
import { SqlitePaymentRepository } from '@nuqtaplus/data';
import { SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
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
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for sales:create
   */
  function validateCreateSalePayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate items
    if (!Array.isArray(data.sale.items) || data.sale.items.length === 0) {
      throw buildValidationError(channel, payload, 'Items must be a non-empty array');
    }

    for (const item of data.sale.items) {
      if (typeof item.productId !== 'number') {
        throw buildValidationError(channel, payload, 'Each item must have a numeric productId');
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw buildValidationError(channel, payload, 'Each item must have a positive quantity');
      }
    }

    // Validate currency if provided
    if (data.sale.currency && typeof data.sale.currency !== 'string') {
      throw buildValidationError(channel, payload, 'Currency must be a string');
    }

    // Validate payment type if provided
    if (
      data.sale.paymentType &&
      !['cash', 'installment', 'mixed'].includes(data.sale.paymentType)
    ) {
      throw buildValidationError(
        channel,
        payload,
        'Payment type must be cash, installment, or mixed'
      );
    }

    // Validate customer ID if installment payment
    if (data.sale.paymentType === 'installment' && !data.sale.customerId) {
      throw buildValidationError(
        channel,
        payload,
        'Customer ID is required for installment payments'
      );
    }
  }

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operations in a transaction for atomicity
   */
  ipcMain.handle('sales:create', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'sales:create' });

      const payload = assertPayload('sales:create', params, ['data']);
      validateCreateSalePayload('sales:create', payload);
      const { sale } = payload.data as any;

      const authenticatedUserId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return createSaleUseCase.execute(sale, authenticatedUserId);
      });

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('sales:addPayment', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'sales:addPayment' });

      const payload = assertPayload('sales:addPayment', params, ['data']);
      const paymentData = payload.data as any;
      if (typeof paymentData.saleId !== 'number') {
        throw buildValidationError('sales:addPayment', payload, 'Sale ID must be a number');
      }

      if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
        throw buildValidationError('sales:addPayment', payload, 'Amount must be a positive number');
      }

      const userId = userContextService.getUserId() || 1;

      // Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return addPaymentUseCase.execute(paymentData, userId);
      });

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('sales:getById', async (_event, params) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'sales:read' });

      const payload = assertPayload('sales:getById', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:getById', payload, 'ID must be a number');
      }

      const sale = await saleRepo.findById(payload.id);
      if (!sale) return { error: 'Sale not found', code: 'NOT_FOUND', statusCode: 404 };
      return sale;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('sales:getAll', async (_event, payload) => {
    try {
      // Check permission (read access)
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
      const result = await saleRepo.findAll(safeParams);
      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('sales:cancel', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:cancel' });
      const payload = assertPayload('sales:cancel', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('sales:cancel', payload, 'ID must be a number');
      }
      await saleRepo.updateStatus(payload.id, 'cancelled');
      return { ok: true };
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });
}
