import { Purchase } from '../entities/Purchase.js';
import type { PaymentMethod } from '../entities/Payment.js';
import type { JournalLine } from '../entities/Accounting.js';
import { IPurchaseRepository } from '../interfaces/IPurchaseRepository.js';
import { ISupplierRepository } from '../interfaces/ISupplierRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { ISupplierLedgerRepository } from '../interfaces/ISupplierLedgerRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { ValidationError } from '../errors/DomainErrors.js';

const ACCT_CASH = '1001';
const ACCT_INVENTORY = '1200';
const AP_ACCOUNT_CODES = ['2001', '2100'];

export interface CreatePurchaseInput {
  invoiceNumber: string;
  supplierId: number;
  items: {
    productId: number;
    productName?: string;
    unitName?: string;
    unitFactor?: number;
    quantity: number;
    quantityBase?: number;
    unitCost: number;
    lineSubtotal?: number;
    discount?: number;
    batchId?: number;
    batchNumber?: string;
    expiryDate?: string;
  }[];
  discount?: number;
  tax?: number;
  paidAmount?: number;
  currency?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  idempotencyKey?: string;
}

export interface CreatePurchaseCommitResult {
  createdPurchase: Purchase;
}

export class CreatePurchaseUseCase {
  constructor(
    private purchaseRepository: IPurchaseRepository,
    private supplierRepository: ISupplierRepository,
    private paymentRepository: IPaymentRepository,
    private supplierLedgerRepository: ISupplierLedgerRepository,
    private accountingRepository: IAccountingRepository,
    private settingsRepository?: ISettingsRepository
  ) {}

  executeCommitPhase(input: CreatePurchaseInput, userId: number): CreatePurchaseCommitResult {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Purchase must include at least one item');
    }

    if (input.idempotencyKey) {
      const existing = this.purchaseRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        return { createdPurchase: existing };
      }
    }

    const subtotal = input.items.reduce((sum, item) => {
      const qty = item.quantity;
      const lineSubtotal = item.lineSubtotal ?? qty * item.unitCost - (item.discount || 0);
      return sum + lineSubtotal;
    }, 0);

    const discount = input.discount || 0;
    const tax = input.tax || 0;
    const total = subtotal - discount + tax;
    const paidAmount = Math.max(0, input.paidAmount || 0);
    const remainingAmount = Math.max(0, total - paidAmount);
    const now = new Date().toISOString();

    const purchase: Purchase = {
      invoiceNumber: input.invoiceNumber,
      supplierId: input.supplierId,
      subtotal,
      discount,
      tax,
      total,
      paidAmount,
      remainingAmount,
      currency: input.currency || 'IQD',
      exchangeRate: 1,
      status: remainingAmount <= 0 ? 'completed' : 'pending',
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      items: input.items.map((item) => {
        const quantityBase = item.quantityBase || item.quantity * (item.unitFactor || 1);
        return {
          productId: item.productId,
          productName: item.productName || `Product #${item.productId}`,
          unitName: item.unitName || 'piece',
          unitFactor: item.unitFactor || 1,
          quantity: item.quantity,
          quantityBase,
          unitCost: item.unitCost,
          lineSubtotal: item.lineSubtotal ?? item.quantity * item.unitCost - (item.discount || 0),
          discount: item.discount || 0,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate || null,
        };
      }),
    };

    const createdPurchase = this.purchaseRepository.createSync(purchase);

    if (paidAmount > 0) {
      this.paymentRepository.createSync({
        purchaseId: createdPurchase.id,
        supplierId: createdPurchase.supplierId,
        amount: paidAmount,
        currency: createdPurchase.currency || 'IQD',
        exchangeRate: 1,
        paymentMethod: input.paymentMethod || 'cash',
        referenceNumber: input.referenceNumber,
        status: 'completed',
        paymentDate: now,
        createdAt: now,
        createdBy: userId,
        // Keep payment idempotency deterministic and unique per purchase write.
        idempotencyKey: input.idempotencyKey
          ? `${input.idempotencyKey}:payment:initial`
          : undefined,
      } as any);
    }

    if (this.isAccountingEnabled() && remainingAmount > 0) {
      const balanceBefore = this.supplierLedgerRepository.getLastBalanceSync(
        createdPurchase.supplierId
      );
      this.supplierLedgerRepository.createSync({
        supplierId: createdPurchase.supplierId,
        transactionType: 'invoice',
        amount: remainingAmount,
        balanceAfter: balanceBefore + remainingAmount,
        purchaseId: createdPurchase.id,
        notes: `Purchase #${createdPurchase.invoiceNumber}`,
        createdBy: userId,
      });
    }

    if (this.isAccountingEnabled()) {
      this.createPurchaseJournalEntry(createdPurchase, paidAmount, remainingAmount, userId);
    }

    return { createdPurchase };
  }

  private createPurchaseJournalEntry(
    purchase: Purchase,
    paidAmount: number,
    remainingAmount: number,
    userId: number
  ): void {
    const inventoryAcct = this.accountingRepository.findAccountByCode(ACCT_INVENTORY);
    const cashAcct = this.accountingRepository.findAccountByCode(ACCT_CASH);
    const apAcct =
      AP_ACCOUNT_CODES.map((code) => this.accountingRepository.findAccountByCode(code)).find(
        Boolean
      ) || null;

    if (!inventoryAcct?.id) {
      console.warn('[CreatePurchaseUseCase] Missing inventory account, skipping journal entry');
      return;
    }

    const lines: JournalLine[] = [];
    lines.push({
      accountId: inventoryAcct.id,
      debit: purchase.total,
      credit: 0,
      description: 'Inventory received',
    });

    if (paidAmount > 0) {
      if (!cashAcct?.id) {
        console.warn('[CreatePurchaseUseCase] Missing cash account, skipping journal entry');
        return;
      }
      lines.push({
        accountId: cashAcct.id,
        debit: 0,
        credit: paidAmount,
        description: 'Cash payment',
      });
    }

    if (remainingAmount > 0) {
      if (!apAcct?.id) {
        console.warn('[CreatePurchaseUseCase] Missing AP account, skipping journal entry');
        return;
      }
      lines.push({
        accountId: apAcct.id,
        debit: 0,
        credit: remainingAmount,
        description: 'Accounts payable',
      });
    }

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    if (totalDebit !== totalCredit) {
      console.warn(
        `[CreatePurchaseUseCase] Unbalanced journal skipped for purchase ${purchase.id}: ${totalDebit} != ${totalCredit}`
      );
      return;
    }

    this.accountingRepository.createJournalEntrySync({
      entryNumber: `JE-PUR-${purchase.id || Date.now()}`,
      entryDate: new Date().toISOString(),
      description: `Purchase #${purchase.invoiceNumber}`,
      sourceType: 'purchase',
      sourceId: purchase.id,
      isPosted: true,
      isReversed: false,
      totalAmount: purchase.total,
      currency: purchase.currency || 'IQD',
      createdBy: userId,
      lines,
    });
  }

  async execute(input: CreatePurchaseInput, userId = 1): Promise<Purchase> {
    return this.executeCommitPhase(input, userId).createdPurchase;
  }

  private isAccountingEnabled(): boolean {
    if (!this.settingsRepository) return true;
    const value = this.settingsRepository.get('accounting.enabled');
    return value !== 'false';
  }
}
