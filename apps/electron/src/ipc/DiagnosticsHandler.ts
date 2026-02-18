import { ipcMain } from 'electron';
import {
  CreatePurchaseUseCase,
  CreateSaleUseCase,
  type CreatePurchaseInput,
  type CreateSaleInput,
  type Customer,
  type Supplier,
  type Product,
} from '@nuqtaplus/core';
import {
  DatabaseType,
  SqliteAccountingRepository,
  SqliteAuditRepository,
  SqliteCustomerLedgerRepository,
  SqliteCustomerRepository,
  SqliteInventoryRepository,
  SqlitePaymentRepository,
  SqliteProductRepository,
  SqlitePurchaseRepository,
  SqliteSaleRepository,
  SqliteSettingsRepository,
  SqliteSupplierLedgerRepository,
  SqliteSupplierRepository,
  withTransaction,
} from '@nuqtaplus/data';
import { mapErrorToIpcResponse, ok } from '../services/IpcErrorMapperService.js';
import { assertPayload } from '../services/IpcPayloadValidator.js';

interface DiagnosticTableSummary {
  table: string;
  rowCount: number;
  lastCreatedAt: string | null;
}

const DIAGNOSTIC_TABLES: Array<{
  table: string;
  createdColumn: string;
}> = [
  { table: 'inventory_movements', createdColumn: 'created_at' },
  { table: 'journal_entries', createdColumn: 'created_at' },
  { table: 'journal_lines', createdColumn: 'created_at' },
  { table: 'customer_ledger', createdColumn: 'created_at' },
  { table: 'supplier_ledger', createdColumn: 'created_at' },
  { table: 'sales', createdColumn: 'created_at' },
  { table: 'purchases', createdColumn: 'created_at' },
  { table: 'payments', createdColumn: 'created_at' },
];

export function registerDiagnosticsHandlers(db: DatabaseType) {
  ipcMain.handle('diagnostics:getFinanceInventoryStatus', async () => {
    try {
      const tables: DiagnosticTableSummary[] = DIAGNOSTIC_TABLES.map((entry) => {
        const row = db.sqlite
          .prepare(
            `SELECT COUNT(*) AS rowCount, MAX(${entry.createdColumn}) AS lastCreatedAt FROM ${entry.table}`
          )
          .get() as { rowCount?: number; lastCreatedAt?: string | null } | undefined;

        return {
          table: entry.table,
          rowCount: row?.rowCount || 0,
          lastCreatedAt: row?.lastCreatedAt || null,
        };
      });

      const warnings: string[] = [];
      const countByTable = new Map(tables.map((item) => [item.table, item.rowCount]));

      const accountsRow = db.sqlite
        .prepare('SELECT COUNT(*) AS rowCount FROM accounts')
        .get() as { rowCount?: number } | undefined;
      const accountsCount = accountsRow?.rowCount || 0;
      if (accountsCount === 0) {
        warnings.push('Chart of accounts is empty; journal entries will be skipped until accounts are seeded.');
      } else {
        const requiredAccountCodes = ['1001', '1100', '1200', '4001', '5001', '2001', '2100'];
        const placeholders = requiredAccountCodes.map(() => '?').join(', ');
        const presentRows = db.sqlite
          .prepare(`SELECT code FROM accounts WHERE code IN (${placeholders})`)
          .all(...requiredAccountCodes) as Array<{ code: string }>;
        const presentCodes = new Set(presentRows.map((r) => String(r.code)));

        const saleRequiredCodes = ['1001', '1100', '1200', '4001', '5001'];
        const missingSaleCodes = saleRequiredCodes.filter((code) => !presentCodes.has(code));
        if (missingSaleCodes.length > 0) {
          warnings.push(`Missing account codes for sale journals: ${missingSaleCodes.join(', ')}.`);
        }

        const hasAp = presentCodes.has('2001') || presentCodes.has('2100');
        if (!hasAp) {
          warnings.push('Missing accounts payable code (2001 or 2100); purchase journals may be skipped.');
        }
      }

      if ((countByTable.get('journal_entries') || 0) === 0) {
        warnings.push('No journal entries found yet.');
      }
      if ((countByTable.get('customer_ledger') || 0) === 0) {
        warnings.push('No customer ledger entries found yet.');
      }
      if ((countByTable.get('supplier_ledger') || 0) === 0) {
        warnings.push('No supplier ledger entries found yet.');
      }
      if ((countByTable.get('inventory_movements') || 0) === 0) {
        warnings.push('No inventory movements found yet.');
      }

      return ok({ tables, warnings });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  async function handleCreateTestSaleCredit(payload: unknown, channel: string) {
    assertPayload(channel, payload, ['data']);

    if (process.env.NODE_ENV === 'production') {
      return ok({
        ok: false,
        message: 'Developer test transactions are disabled in production.',
      });
    }

    const productRepo = new SqliteProductRepository(db.db);
    const saleRepo = new SqliteSaleRepository(db.db);
    const customerRepo = new SqliteCustomerRepository(db.db);
    const settingsRepo = new SqliteSettingsRepository(db.db);
    const paymentRepo = new SqlitePaymentRepository(db.db);
    const inventoryRepo = new SqliteInventoryRepository(db.db);
    const accountingRepo = new SqliteAccountingRepository(db.db);
    const customerLedgerRepo = new SqliteCustomerLedgerRepository(db.db);
    const auditRepo = new SqliteAuditRepository(db.db);

    const useCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      inventoryRepo,
      accountingRepo,
      customerLedgerRepo,
      auditRepo
    );

    const availableProduct =
      productRepo
        .findAll({ limit: 50 })
        .items.find(
          (item) => Boolean(item.id) && (item.stock || 0) > 0 && (item.sellingPrice || 0) > 0
        ) || null;

    if (!availableProduct?.id) {
      return ok({
        ok: false,
        message: 'No in-stock priced product was found. Add stock first, then retry.',
      });
    }

    const existingCustomer = customerRepo.findAll({ limit: 1, offset: 0 }).items[0] || null;
    const customer: Customer =
      existingCustomer ||
      customerRepo.create({
        name: 'Developer Test Customer',
        phone: null,
        address: null,
        city: null,
        notes: 'Created by diagnostics panel',
        totalPurchases: 0,
        totalDebt: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 1,
      });

    const payloadInput: CreateSaleInput = {
      items: [
        {
          productId: availableProduct.id,
          quantity: 1,
          unitPrice: availableProduct.sellingPrice,
          unitName: availableProduct.unit || 'piece',
          unitFactor: 1,
          discount: 0,
        },
      ],
      customerId: customer.id,
      discount: 0,
      tax: 0,
      paymentType: 'credit',
      paidAmount: 0,
      currency: 'IQD',
      notes: 'Developer diagnostics test credit sale',
      idempotencyKey: `diag-sale-credit-${Date.now()}`,
    };

    const result = withTransaction(db.sqlite, () => useCase.executeCommitPhase(payloadInput, 1));
    await useCase.executeSideEffectsPhase(result);

    return ok({
      ok: true,
      message: 'Developer test credit sale created.',
      createdSaleId: result.createdSale.id,
    });
  }

  ipcMain.handle('diagnostics:createTestTransaction', async (_event, payload) => {
    try {
      // Backward-compatible alias: historically this created a credit sale.
      return await handleCreateTestSaleCredit(payload, 'diagnostics:createTestTransaction');
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('diagnostics:createTestSaleCash', async (_event, payload) => {
    try {
      assertPayload('diagnostics:createTestSaleCash', payload, ['data']);

      if (process.env.NODE_ENV === 'production') {
        return ok({
          ok: false,
          message: 'Developer test transactions are disabled in production.',
        });
      }

      const productRepo = new SqliteProductRepository(db.db);
      const saleRepo = new SqliteSaleRepository(db.db);
      const customerRepo = new SqliteCustomerRepository(db.db);
      const settingsRepo = new SqliteSettingsRepository(db.db);
      const paymentRepo = new SqlitePaymentRepository(db.db);
      const inventoryRepo = new SqliteInventoryRepository(db.db);
      const accountingRepo = new SqliteAccountingRepository(db.db);
      const customerLedgerRepo = new SqliteCustomerLedgerRepository(db.db);
      const auditRepo = new SqliteAuditRepository(db.db);

      const useCase = new CreateSaleUseCase(
        saleRepo,
        productRepo,
        customerRepo,
        settingsRepo,
        paymentRepo,
        inventoryRepo,
        accountingRepo,
        customerLedgerRepo,
        auditRepo
      );

      const availableProduct =
        productRepo
          .findAll({ limit: 50 })
          .items.find((item) => Boolean(item.id) && (item.stock || 0) > 0 && (item.sellingPrice || 0) > 0) ||
        null;

      if (!availableProduct?.id) {
        return ok({
          ok: false,
          message: 'No in-stock priced product was found. Add stock first, then retry.',
        });
      }

      const existingCustomer = customerRepo.findAll({ limit: 1, offset: 0 }).items[0] || null;
      const customer: Customer =
        existingCustomer ||
        customerRepo.create({
          name: 'Developer Test Customer',
          phone: null,
          address: null,
          city: null,
          notes: 'Created by diagnostics panel',
          totalPurchases: 0,
          totalDebt: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 1,
        });

      const quantity = 1;
      const total = quantity * availableProduct.sellingPrice;

      const payloadInput: CreateSaleInput = {
        items: [
          {
            productId: availableProduct.id,
            quantity,
            unitPrice: availableProduct.sellingPrice,
            unitName: availableProduct.unit || 'piece',
            unitFactor: 1,
            discount: 0,
          },
        ],
        customerId: customer.id,
        discount: 0,
        tax: 0,
        paymentType: 'cash',
        paidAmount: total,
        currency: 'IQD',
        notes: 'Developer diagnostics test cash sale',
        idempotencyKey: `diag-sale-cash-${Date.now()}`,
      };

      const result = withTransaction(db.sqlite, () => useCase.executeCommitPhase(payloadInput, 1));
      await useCase.executeSideEffectsPhase(result);

      return ok({
        ok: true,
        message: 'Developer test cash sale created.',
        createdSaleId: result.createdSale.id,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('diagnostics:createTestSaleCredit', async (_event, payload) => {
    try {
      return await handleCreateTestSaleCredit(payload, 'diagnostics:createTestSaleCredit');
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('diagnostics:createTestPurchase', async (_event, payload) => {
    try {
      assertPayload('diagnostics:createTestPurchase', payload, ['data']);

      if (process.env.NODE_ENV === 'production') {
        return ok({
          ok: false,
          message: 'Developer test transactions are disabled in production.',
        });
      }

      const productRepo = new SqliteProductRepository(db.db);
      const purchaseRepo = new SqlitePurchaseRepository(db.db);
      const supplierRepo = new SqliteSupplierRepository(db.db);
      const paymentRepo = new SqlitePaymentRepository(db.db);
      const supplierLedgerRepo = new SqliteSupplierLedgerRepository(db.db);
      const accountingRepo = new SqliteAccountingRepository(db.db);

      const purchaseUseCase = new CreatePurchaseUseCase(
        purchaseRepo,
        supplierRepo,
        paymentRepo,
        supplierLedgerRepo,
        accountingRepo
      );

      const existingSupplier = (await supplierRepo.findAll({ limit: 1, offset: 0 })).items[0] || null;
      const supplier: Supplier =
        existingSupplier ||
        (await supplierRepo.create({
          name: 'Developer Test Supplier',
          phone: null,
          phone2: null,
          address: null,
          city: null,
          notes: 'Created by diagnostics panel',
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          createdBy: 1,
        }));

      let product = productRepo.findAll({ limit: 1, offset: 0 }).items[0] || null;
      if (!product?.id) {
        const now = new Date().toISOString();
        product = productRepo.create({
          name: 'Developer Test Product',
          sku: null,
          barcode: null,
          categoryId: null,
          description: 'Created by diagnostics panel',
          costPrice: 1000,
          sellingPrice: 1500,
          currency: 'IQD',
          stock: 0,
          minStock: 0,
          unit: 'piece',
          supplier: null,
          supplierId: supplier.id,
          expireDate: null,
          isExpire: false,
          status: 'available',
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy: 1,
        } as Product);
      }

      const purchaseInput: CreatePurchaseInput = {
        invoiceNumber: `DEV-PUR-${Date.now()}`,
        supplierId: supplier.id!,
        items: [
          {
            productId: product.id!,
            productName: product.name,
            unitName: product.unit || 'piece',
            unitFactor: 1,
            quantity: 1,
            unitCost: Math.max(1, product.costPrice || 1000),
          },
        ],
        discount: 0,
        tax: 0,
        paidAmount: 0,
        currency: 'IQD',
        notes: 'Developer diagnostics test purchase (credit)',
        idempotencyKey: `diag-purchase-${Date.now()}`,
      };

      const result = withTransaction(db.sqlite, () => purchaseUseCase.executeCommitPhase(purchaseInput, 1));

      return ok({
        ok: true,
        message: 'Developer test purchase created.',
        createdPurchaseId: result.createdPurchase.id,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
