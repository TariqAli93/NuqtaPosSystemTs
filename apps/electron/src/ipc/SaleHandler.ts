import { ipcMain } from 'electron';
import {
  CreateSaleUseCase,
  mapErrorToResult,
  ok,
  AddPaymentUseCase,
  AuditService,
  ReverseEntryUseCase,
} from '@nuqtaplus/core';
import {
  SqliteSaleRepository,
  SqliteProductRepository,
  SqliteCustomerRepository,
  SqliteSettingsRepository,
  SqlitePaymentRepository,
  SqliteAuditRepository,
  SqliteInventoryRepository,
  SqliteAccountingRepository,
  SqliteCustomerLedgerRepository,
  SqliteFifoService,
  SqlitePostingRepository,
  withTransaction,
  DatabaseType,
  schema,
} from '@nuqtaplus/data';
import { and, eq } from 'drizzle-orm';

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
  const inventoryRepo = new SqliteInventoryRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const customerLedgerRepo = new SqliteCustomerLedgerRepository(db.db);
  const fifoService = new SqliteFifoService(db.db);
  const auditService = new AuditService(auditRepo);
  const postingRepo = new SqlitePostingRepository(db.db);

  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo,
    inventoryRepo,
    accountingRepo,
    customerLedgerRepo,
    auditRepo,
    fifoService
  );

  const addPaymentUseCase = new AddPaymentUseCase(
    saleRepo,
    paymentRepo,
    customerRepo,
    customerLedgerRepo,
    accountingRepo,
    settingsRepo,
    auditRepo
  );

  const reverseEntryUseCase = new ReverseEntryUseCase(postingRepo, accountingRepo);

  function restoreInventoryForSale(sale: any, userId: number, reason: 'cancel' | 'refund'): number {
    const depletions = saleRepo.getItemDepletionsBySaleId(sale.id);
    const saleItemsById = new Map<number, any>();
    for (const item of sale.items || []) {
      if (item.id) {
        saleItemsById.set(item.id, item);
      }
    }

    let restoredRows = 0;
    if (depletions.length > 0) {
      for (const depletion of depletions) {
        const currentProduct = productRepo.findById(depletion.productId);
        if (!currentProduct) continue;

        const stockBefore = currentProduct.stock || 0;
        const stockAfter = stockBefore + depletion.quantityBase;
        const item = saleItemsById.get(depletion.saleItemId);

        inventoryRepo.createMovementSync({
          productId: depletion.productId,
          batchId: depletion.batchId,
          movementType: 'in',
          reason: 'return',
          quantityBase: depletion.quantityBase,
          unitName: item?.unitName || 'piece',
          unitFactor: item?.unitFactor || 1,
          stockBefore,
          stockAfter,
          costPerUnit: depletion.costPerUnit,
          totalCost: depletion.totalCost,
          sourceType: 'sale',
          sourceId: sale.id,
          notes: `${reason} sale #${sale.invoiceNumber}`,
          createdBy: userId,
        });

        productRepo.updateStock(depletion.productId, depletion.quantityBase);
        productRepo.updateBatchStock(depletion.batchId, depletion.quantityBase);
        restoredRows += 1;
      }

      return restoredRows;
    }

    // Fallback for historical sales created before sale_item_depletions existed.
    for (const item of sale.items || []) {
      const quantityBase = item.quantityBase ?? item.quantity * (item.unitFactor || 1);
      const currentProduct = productRepo.findById(item.productId);
      if (!currentProduct) continue;

      const stockBefore = currentProduct.stock || 0;
      const stockAfter = stockBefore + quantityBase;

      inventoryRepo.createMovementSync({
        productId: item.productId,
        batchId: item.batchId,
        movementType: 'in',
        reason: 'return',
        quantityBase,
        unitName: item.unitName || 'piece',
        unitFactor: item.unitFactor || 1,
        stockBefore,
        stockAfter,
        costPerUnit: currentProduct.costPrice,
        totalCost: quantityBase * currentProduct.costPrice,
        sourceType: 'sale',
        sourceId: sale.id,
        notes: `${reason} sale #${sale.invoiceNumber} (legacy fallback)`,
        createdBy: userId,
      });

      productRepo.updateStock(item.productId, quantityBase);
      if (item.batchId) {
        productRepo.updateBatchStock(item.batchId, quantityBase);
      }
      restoredRows += 1;
    }

    return restoredRows;
  }

  /**
   * Reverse all journal entries linked to a sale using the domain ReverseEntryUseCase.
   * Handles both posted entries (creates counter-entry) and unposted entries (voids in place).
   * Respects posting batch locks — will throw if any entry is in a locked batch.
   */
  function reverseJournalEntries(sale: any, userId: number): number {
    const originalEntries = db.db
      .select()
      .from(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.sourceType, 'sale'),
          eq(schema.journalEntries.sourceId, sale.id)
        )
      )
      .all();

    let reversedCount = 0;
    for (const entry of originalEntries) {
      if (!entry.id || entry.isReversed) continue;

      reverseEntryUseCase.executeCommitPhase(
        {
          id: entry.id,
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          description: entry.description || '',
          sourceType:
            (entry.sourceType as 'sale' | 'purchase' | 'adjustment' | 'payment' | 'manual') ||
            'sale',
          sourceId: entry.sourceId ?? undefined,
          isPosted: !!entry.isPosted,
          isReversed: !!entry.isReversed,
          postingBatchId: entry.postingBatchId ?? undefined,
          totalAmount: entry.totalAmount ?? 0,
          currency: entry.currency || 'IQD',
          notes: entry.notes ?? undefined,
          lines: [],
        },
        userId
      );
      reversedCount += 1;
    }

    return reversedCount;
  }

  function reverseSaleTransaction(saleId: number, userId: number, reason: 'cancel' | 'refund') {
    const sale = saleRepo.findById(saleId);
    if (!sale) {
      throw new Error(`Sale ${saleId} not found`);
    }

    if (sale.status === 'cancelled') {
      return {
        sale,
        restoredRows: 0,
        reversalEntries: 0,
        debtAdjustment: 0,
      };
    }

    const restoredRows = restoreInventoryForSale(sale, userId, reason);
    const reversalEntries = reverseJournalEntries(sale, userId);

    let debtAdjustment = 0;
    if (sale.customerId && sale.remainingAmount > 0) {
      const balanceBefore = customerLedgerRepo.getLastBalanceSync(sale.customerId);
      customerLedgerRepo.createSync({
        customerId: sale.customerId,
        transactionType: 'return',
        amount: -sale.remainingAmount,
        balanceAfter: balanceBefore - sale.remainingAmount,
        saleId: sale.id,
        notes: `Reverse sale debt #${sale.invoiceNumber}`,
        createdBy: userId,
      });
      debtAdjustment = sale.remainingAmount;
    }

    saleRepo.updateStatus(sale.id!, 'cancelled');
    const updatedSale = saleRepo.findById(sale.id!);

    return {
      sale: updatedSale || sale,
      restoredRows,
      reversalEntries,
      debtAdjustment,
    };
  }

  /**
   * Validates CreateSaleInput DTO (flat, no wrapper keys).
   * Payload shape: { data: CreateSaleInput }
   */
  function validateCreateSalePayload(channel: string, payload: any): void {
    const data = payload.data;

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

    if (data.currency && typeof data.currency !== 'string') {
      throw buildValidationError(channel, payload, 'Currency must be a string');
    }

    if (
      data.paymentType &&
      !['cash', 'credit', 'mixed', 'installment'].includes(data.paymentType)
    ) {
      throw buildValidationError(channel, payload, 'Payment type must be cash, credit, or mixed');
    }

    if (
      data.paymentMethod &&
      !['cash', 'card', 'bank_transfer', 'credit'].includes(data.paymentMethod)
    ) {
      throw buildValidationError(
        channel,
        payload,
        'Payment method must be cash, card, bank_transfer, or credit'
      );
    }

    if (data.paymentMethod === 'card' && !data.referenceNumber?.trim()) {
      throw buildValidationError(channel, payload, 'Card payments require a reference number');
    }

    if (data.paymentMethod === 'credit' && !data.customerId) {
      throw buildValidationError(channel, payload, 'Credit/debt payments require a customer');
    }

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
    if (!Number.isInteger(data.amount)) {
      throw buildValidationError(channel, payload, 'Amount must be an integer IQD amount');
    }

    if (
      data.paymentMethod &&
      !['cash', 'card', 'bank_transfer', 'credit'].includes(data.paymentMethod)
    ) {
      throw buildValidationError(
        channel,
        payload,
        'Payment method must be cash, card, bank_transfer, or credit'
      );
    }

    if (data.paymentMethod === 'card' && !data.referenceNumber?.trim()) {
      throw buildValidationError(channel, payload, 'Card payments require a reference number');
    }
  }

  ipcMain.handle('sales:create', async (_event, params) => {
    try {
      requirePermission({ permission: 'sales:create' });

      const payload = assertPayload('sales:create', params, ['data']);
      validateCreateSalePayload('sales:create', payload);

      const saleInput = payload.data as any;
      if (saleInput.paymentType === 'installment') {
        saleInput.paymentType = 'credit';
      }

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

      const paymentInput = payload.data as any;
      const userId = userContextService.getUserId() || 1;

      const commitResult = withTransaction(db.sqlite, () => {
        return addPaymentUseCase.executeCommitPhase(paymentInput, userId);
      });
      await addPaymentUseCase.executeSideEffectsPhase(commitResult, paymentInput, userId);

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

      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () =>
        reverseSaleTransaction(payload.id as number, userId, 'cancel')
      );

      await auditService.logAction(
        userId,
        'sale:cancel',
        'Sale',
        payload.id,
        `Cancelled sale #${result.sale.invoiceNumber}`,
        {
          restoredRows: result.restoredRows,
          reversalEntries: result.reversalEntries,
          debtAdjustment: result.debtAdjustment,
        }
      );

      return ok(result.sale);
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

      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () =>
        reverseSaleTransaction(payload.id as number, userId, 'refund')
      );

      await auditService.logAction(
        userId,
        'sale:refund',
        'Sale',
        payload.id as number,
        `Refunded sale #${result.sale.invoiceNumber}`,
        {
          restoredRows: result.restoredRows,
          reversalEntries: result.reversalEntries,
          debtAdjustment: result.debtAdjustment,
        }
      );

      return ok(result.sale);
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
