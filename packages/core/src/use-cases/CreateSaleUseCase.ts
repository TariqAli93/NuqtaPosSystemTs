import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { IProductRepository } from '../interfaces/IProductRepository.js';
import { ICustomerRepository } from '../interfaces/ICustomerRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { IInventoryRepository } from '../interfaces/IInventoryRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { ICustomerLedgerRepository } from '../interfaces/ICustomerLedgerRepository.js';
import { IAuditRepository } from '../interfaces/IAuditRepository.js';
import { Sale } from '../entities/Sale.js';
import type { PaymentMethod } from '../entities/Payment.js';
import type { JournalLine } from '../entities/Accounting.js';
import {
  ValidationError,
  NotFoundError,
  InsufficientStockError,
  ConflictError,
} from '../errors/DomainErrors.js';
import { AuditService } from '../services/AuditService.js';
import { generateInvoiceNumber, calculateSaleTotals, roundByCurrency } from '../utils/helpers.js';

// ─── Account code constants (see seed data chart of accounts) ─────────
const ACCT_CASH = '1001'; // الصندوق
const ACCT_AR = '1100'; // ذمم العملاء
const ACCT_REVENUE = '4001'; // إيرادات المبيعات
const ACCT_COGS = '5001'; // تكلفة البضاعة
const ACCT_INVENTORY = '1200'; // المخزون

function logDevDiagnostics(event: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') return;
  try {
    console.log(JSON.stringify({ scope: 'CreateSaleUseCase', ...event }));
  } catch {
    // Diagnostics logging must never break the sale flow.
  }
}

export interface CreateSaleInput {
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    unitName?: string;
    unitFactor?: number;
    batchId?: number;
  }[];
  customerId?: number;
  discount?: number;
  tax?: number;
  paymentType: 'cash' | 'credit' | 'mixed';
  paidAmount?: number;
  currency?: string;
  notes?: string;
  interestRate?: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  idempotencyKey?: string;
}

export interface CreateSaleCommitResult {
  createdSale: Sale;
  userId: number;
  currency: string;
}

type CreateSaleDiagnostics = {
  inventoryMovementsCreated: number;
  paymentCreated: { created: boolean; reason: string };
  journalCreated: { created: boolean; reason: string; missingAccountCodes?: string[] };
  customerLedgerCreated: { created: boolean; reason: string };
};

export class CreateSaleUseCase {
  private auditService: AuditService;

  constructor(
    private saleRepo: ISaleRepository,
    private productRepo: IProductRepository,
    private customerRepo: ICustomerRepository,
    private settingsRepo: ISettingsRepository,
    private paymentRepo: IPaymentRepository,
    private inventoryRepo: IInventoryRepository,
    private accountingRepo: IAccountingRepository,
    private customerLedgerRepo: ICustomerLedgerRepository,
    auditRepo?: IAuditRepository
  ) {
    this.auditService = new AuditService(auditRepo as IAuditRepository);
  }

  executeCommitPhase(input: CreateSaleInput, userId: number): CreateSaleCommitResult {
    const diagnostics: CreateSaleDiagnostics = {
      inventoryMovementsCreated: 0,
      paymentCreated: { created: false, reason: 'not-executed' },
      journalCreated: { created: false, reason: 'not-executed' },
      customerLedgerCreated: { created: false, reason: 'not-executed' },
    };
    // ── Step 1: Idempotency check ───────────────────────────────
    if (input.idempotencyKey) {
      const existing = this.saleRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const currencySettings = this.settingsRepo.getCurrencySettings();
        diagnostics.paymentCreated = { created: false, reason: 'idempotency-hit' };
        diagnostics.journalCreated = { created: false, reason: 'idempotency-hit' };
        diagnostics.customerLedgerCreated = { created: false, reason: 'idempotency-hit' };
        logDevDiagnostics({
          phase: 'commit',
          idempotencyKey: input.idempotencyKey,
          saleId: existing.id,
          ...diagnostics,
        });
        return {
          createdSale: existing,
          userId,
          currency: input.currency || currencySettings.defaultCurrency,
        };
      }
    }

    // ── Step 2: Validate items ──────────────────────────────────
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Sale must have at least one item');
    }

    // Payment-method-specific validation
    if (input.paymentMethod === 'card' && !input.referenceNumber?.trim()) {
      throw new ValidationError('Card payments require a reference number');
    }

    if (input.paymentMethod === 'credit' && !input.customerId) {
      throw new ValidationError('Credit/debt payments require a customer');
    }

    const currencySettings = this.settingsRepo.getCurrencySettings();
    const currency = input.currency || currencySettings.defaultCurrency;

    // ── Step 3: Validate products, stock, batches & build items ─
    const saleItems: {
      productId: number;
      productName: string;
      quantity: number;
      unitName: string;
      unitFactor: number;
      quantityBase: number;
      batchId?: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
      costPrice: number;
    }[] = [];

    let totalCOGS = 0;

    for (const item of input.items) {
      const product = this.productRepo.findById(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`, {
          productId: item.productId,
        });
      }

      if (!product.id) {
        throw new Error(`Product ${product.name} has no ID`);
      }

      const unitName = item.unitName || 'piece';
      const unitFactor = item.unitFactor || 1;
      const quantityBase = item.quantity * unitFactor;

      // Stock check against cached stock (products.stock)
      if ((product.stock || 0) < quantityBase) {
        throw new InsufficientStockError(`Insufficient stock for ${product.name}`, {
          productId: product.id,
          productName: product.name,
          available: product.stock || 0,
          requested: quantityBase,
        });
      }

      const itemCostTotal = quantityBase * product.costPrice;
      totalCOGS += itemCostTotal;

      saleItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitName,
        unitFactor,
        quantityBase,
        batchId: item.batchId,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.quantity * item.unitPrice - (item.discount || 0) * item.quantity,
        costPrice: product.costPrice,
      });
    }

    // ── Step 4: Calculate totals ────────────────────────────────
    const totals = calculateSaleTotals(input.items, input.discount, input.tax);

    let interestAmount = 0;
    let finalTotal = totals.total;
    if (
      (input.paymentType === 'credit' || input.paymentType === 'mixed') &&
      input.interestRate &&
      input.interestRate > 0
    ) {
      interestAmount = (totals.total * input.interestRate) / 100;
      finalTotal = totals.total + interestAmount;
    }

    finalTotal = roundByCurrency(finalTotal, currency);
    const paidAmount = roundByCurrency(input.paidAmount || 0, currency);
    let remainingAmount = Math.max(0, finalTotal - paidAmount);
    const threshold = currency === 'IQD' ? 250 : 0.01;
    if (remainingAmount < threshold) {
      remainingAmount = 0;
    } else {
      remainingAmount = roundByCurrency(remainingAmount, currency);
    }

    // ── Step 5: Create sale record ──────────────────────────────
    const saleData: Sale = {
      invoiceNumber: generateInvoiceNumber(),
      customerId: input.customerId,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: finalTotal,
      currency,
      exchangeRate: 1,
      paymentType: input.paymentType,
      paidAmount,
      remainingAmount,
      status: remainingAmount <= 0 ? 'completed' : 'pending',
      notes: input.notes,
      interestRate: input.interestRate || 0,
      interestAmount: roundByCurrency(interestAmount, currency),
      idempotencyKey: input.idempotencyKey,
      createdBy: userId,
      items: saleItems.map((si) => ({
        productId: si.productId,
        productName: si.productName,
        quantity: si.quantity,
        unitName: si.unitName,
        unitFactor: si.unitFactor,
        quantityBase: si.quantityBase,
        batchId: si.batchId,
        unitPrice: si.unitPrice,
        discount: si.discount,
        subtotal: si.subtotal,
      })),
      createdAt: new Date().toISOString(),
    };

    const createdSale = this.saleRepo.create(saleData);

    // ── Step 6 & 7: Inventory movements + stock update ──────────
    for (const item of saleItems) {
      const currentProduct = this.productRepo.findById(item.productId)!;
      const stockBefore = currentProduct.stock || 0;
      const stockAfter = stockBefore - item.quantityBase;

      // Create inventory movement (immutable ledger entry)
      this.inventoryRepo.createMovementSync({
        productId: item.productId,
        batchId: item.batchId,
        movementType: 'out',
        reason: 'sale',
        quantityBase: item.quantityBase,
        unitName: item.unitName,
        unitFactor: item.unitFactor,
        stockBefore,
        stockAfter,
        costPerUnit: item.costPrice,
        totalCost: item.quantityBase * item.costPrice,
        sourceType: 'sale',
        sourceId: createdSale.id,
        notes: `Sale #${createdSale.invoiceNumber}`,
        createdBy: userId,
      });
      diagnostics.inventoryMovementsCreated += 1;

      // Update products.stock cache
      this.productRepo.updateStock(item.productId, -item.quantityBase);

      if (item.batchId) {
        this.productRepo.updateBatchStock(item.batchId, -item.quantityBase);
      }
    }

    // ── Step 8: Create payment ──────────────────────────────────
    if (paidAmount > 0) {
      this.paymentRepo.createSync({
        saleId: createdSale.id,
        customerId: input.customerId,
        amount: paidAmount,
        currency,
        exchangeRate: 1,
        paymentMethod: input.paymentMethod || 'cash',
        referenceNumber: input.referenceNumber,
        idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:payment:initial` : undefined,
        createdBy: userId,
      });
      diagnostics.paymentCreated = { created: true, reason: 'paidAmount>0' };
    } else {
      diagnostics.paymentCreated = { created: false, reason: 'paidAmount<=0' };
    }

    // ── Step 9: Accounting journal entry ─────────────────────────
    diagnostics.journalCreated = this.createSaleJournalEntry(
      createdSale,
      totalCOGS,
      paidAmount,
      remainingAmount,
      currency,
      userId
    );

    // ── Step 10: Customer ledger + debt ──────────────────────────
    if (input.customerId && remainingAmount > 0) {
      const currentDebt = this.customerLedgerRepo.getLastBalanceSync(input.customerId);
      const newBalance = currentDebt + remainingAmount;

      this.customerLedgerRepo.createSync({
        customerId: input.customerId,
        transactionType: 'invoice',
        amount: remainingAmount,
        balanceAfter: newBalance,
        saleId: createdSale.id,
        notes: `Sale #${createdSale.invoiceNumber}`,
        createdBy: userId,
      });
      diagnostics.customerLedgerCreated = { created: true, reason: 'remainingAmount>0' };
    } else if (!input.customerId) {
      diagnostics.customerLedgerCreated = { created: false, reason: 'missing-customerId' };
    } else {
      diagnostics.customerLedgerCreated = { created: false, reason: 'remainingAmount<=0' };
    }

    logDevDiagnostics({
      phase: 'commit',
      idempotencyKey: input.idempotencyKey,
      saleId: createdSale.id,
      ...diagnostics,
    });

    return {
      createdSale,
      userId,
      currency,
    };
  }

  /**
   * Creates a double-entry journal entry for the sale.
   * Gracefully skips if chart of accounts is not set up.
   */
  private createSaleJournalEntry(
    sale: Sale,
    totalCOGS: number,
    paidAmount: number,
    remainingAmount: number,
    currency: string,
    userId: number
  ): { created: boolean; reason: string; missingAccountCodes?: string[] } {
    // Look up account IDs by code
    const cashAcct = this.accountingRepo.findAccountByCode(ACCT_CASH);
    const arAcct = this.accountingRepo.findAccountByCode(ACCT_AR);
    const revenueAcct = this.accountingRepo.findAccountByCode(ACCT_REVENUE);
    const cogsAcct = this.accountingRepo.findAccountByCode(ACCT_COGS);
    const inventoryAcct = this.accountingRepo.findAccountByCode(ACCT_INVENTORY);

    // If required accounts are missing, skip journal entry creation
    const missing: string[] = [];
    if (!revenueAcct?.id) missing.push(ACCT_REVENUE);
    if (paidAmount > 0 && !cashAcct?.id) missing.push(ACCT_CASH);
    if (remainingAmount > 0 && !arAcct?.id) missing.push(ACCT_AR);
    if (totalCOGS > 0) {
      if (!cogsAcct?.id) missing.push(ACCT_COGS);
      if (!inventoryAcct?.id) missing.push(ACCT_INVENTORY);
    }

    if (missing.length > 0) {
      console.warn(
        `[CreateSaleUseCase] Missing chart accounts (${missing.join(', ')}), skipping journal entry`
      );
      return { created: false, reason: 'missing-chart-accounts', missingAccountCodes: missing };
    }

    const lines: JournalLine[] = [];
    const revenueAccountId = revenueAcct!.id!;

    // Revenue entry (always)
    lines.push({
      accountId: revenueAccountId,
      debit: 0,
      credit: sale.total,
      description: 'إيرادات المبيعات',
    });

    // Cash received (if any)
    if (paidAmount > 0 && cashAcct?.id) {
      lines.push({
        accountId: cashAcct.id,
        debit: paidAmount,
        credit: 0,
        description: 'تحصيل نقدي',
      });
    }

    // Accounts receivable (if credit portion)
    if (remainingAmount > 0 && arAcct?.id) {
      lines.push({
        accountId: arAcct.id,
        debit: remainingAmount,
        credit: 0,
        description: 'ذمم العملاء',
      });
    }

    // COGS / Inventory entries (if accounts exist and COGS > 0)
    if (totalCOGS > 0 && cogsAcct?.id && inventoryAcct?.id) {
      lines.push({
        accountId: cogsAcct.id,
        debit: totalCOGS,
        credit: 0,
        description: 'تكلفة البضاعة المباعة',
      });

      lines.push({
        accountId: inventoryAcct.id,
        debit: 0,
        credit: totalCOGS,
        description: 'تخفيض المخزون',
      });
    }

    const entryNumber = `JE-SALE-${sale.id || Date.now()}`;

    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    if (totalDebit !== totalCredit) {
      console.warn(
        `[CreateSaleUseCase] Unbalanced journal skipped for sale ${sale.id}: ${totalDebit} != ${totalCredit}`
      );
      return {
        created: false,
        reason: `unbalanced-journal:${totalDebit}!=${totalCredit}`,
      };
    }

    this.accountingRepo.createJournalEntrySync({
      entryNumber,
      entryDate: new Date().toISOString(),
      description: `Sale #${sale.invoiceNumber}`,
      sourceType: 'sale',
      sourceId: sale.id,
      isPosted: true,
      isReversed: false,
      totalAmount: sale.total,
      currency,
      createdBy: userId,
      lines,
    });
    return { created: true, reason: 'created' };
  }

  async executeSideEffectsPhase(commitResult: CreateSaleCommitResult): Promise<void> {
    const { createdSale, userId, currency } = commitResult;

    try {
      await this.auditService.logCreate(
        userId,
        'Sale',
        createdSale.id!,
        {
          invoiceNumber: createdSale.invoiceNumber,
          customerId: createdSale.customerId,
          total: createdSale.total,
          items: createdSale.items?.length,
        },
        `Sale created: Invoice #${createdSale.invoiceNumber}, Total: ${createdSale.total} ${currency}`
      );
    } catch (auditErr) {
      // Audit logging should not fail the main operation.
      console.warn('Audit logging failed for sale creation:', auditErr);
    }
  }

  async execute(input: CreateSaleInput, userId: number): Promise<Sale> {
    const commitResult = this.executeCommitPhase(input, userId);
    await this.executeSideEffectsPhase(commitResult);
    return commitResult.createdSale;
  }
}
