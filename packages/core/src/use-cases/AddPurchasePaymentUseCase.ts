import { IPurchaseRepository } from '../interfaces/IPurchaseRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { ISupplierLedgerRepository } from '../interfaces/ISupplierLedgerRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { IAuditRepository } from '../interfaces/IAuditRepository.js';
import { NotFoundError, InvalidStateError, ValidationError } from '../errors/DomainErrors.js';
import { roundByCurrency } from '../utils/helpers.js';
import { Purchase } from '../entities/Purchase.js';
import type { PaymentMethod } from '../entities/Payment.js';
import type { JournalLine } from '../entities/Accounting.js';
import { MODULE_SETTING_KEYS } from '../entities/ModuleSettings.js';
import { AuditService } from '../services/AuditService.js';

const ACCT_CASH = '1001';
const ACCT_AP = '2100';

export interface AddPurchasePaymentInput {
  purchaseId: number;
  supplierId?: number;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  idempotencyKey?: string;
}

/**
 * AddPurchasePaymentUseCase
 * Adds a payment to a purchase invoice in one transaction-safe commit phase:
 * 1) validate + clamp payment amount against remaining amount
 * 2) insert payment
 * 3) update purchase paid/remaining/status
 * 4) insert supplier ledger entry (if ledgers are enabled)
 * 5) create draft journal entry (if accounting is enabled)
 */
export class AddPurchasePaymentUseCase {
  private auditService?: AuditService;

  constructor(
    private purchaseRepo: IPurchaseRepository,
    private paymentRepo: IPaymentRepository,
    private supplierLedgerRepo: ISupplierLedgerRepository,
    private accountingRepo: IAccountingRepository,
    private settingsRepo?: ISettingsRepository,
    auditRepo?: IAuditRepository
  ) {
    if (auditRepo) {
      this.auditService = new AuditService(auditRepo);
    }
  }

  executeCommitPhase(
    input: AddPurchasePaymentInput,
    userId: number
  ): { updatedPurchase: Purchase } {
    // Idempotency check
    if (input.idempotencyKey) {
      const existing = this.paymentRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existing?.purchaseId) {
        const existingPurchase = this.findPurchaseSync(existing.purchaseId);
        if (existingPurchase) {
          return { updatedPurchase: existingPurchase };
        }
        return { updatedPurchase: { id: existing.purchaseId } as Purchase };
      }
    }

    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero', {
        amount: input.amount,
      });
    }

    if (!Number.isInteger(input.amount)) {
      throw new ValidationError('Payment amount must be an integer IQD amount', {
        amount: input.amount,
      });
    }

    if (input.paymentMethod === 'card' && !input.referenceNumber?.trim()) {
      throw new ValidationError('Card payments require a reference number');
    }

    const purchase = this.findPurchaseSync(input.purchaseId);
    if (!purchase) {
      throw new NotFoundError('Purchase not found', { purchaseId: input.purchaseId });
    }

    if (purchase.status === 'cancelled') {
      throw new InvalidStateError('Cannot add payment to cancelled purchase', {
        purchaseId: purchase.id,
        status: purchase.status,
      });
    }

    if ((purchase.remainingAmount || 0) <= 0) {
      throw new InvalidStateError('Purchase is already fully paid', { purchaseId: purchase.id });
    }

    const currency = input.currency || purchase.currency || 'IQD';
    if (
      currency === 'IQD' &&
      (!Number.isInteger(purchase.remainingAmount || 0) ||
        !Number.isInteger(purchase.paidAmount || 0) ||
        !Number.isInteger(purchase.total || 0))
    ) {
      throw new InvalidStateError('Purchase amounts must be integer IQD values', {
        purchaseId: purchase.id,
        remainingAmount: purchase.remainingAmount,
        paidAmount: purchase.paidAmount,
        total: purchase.total,
      });
    }
    const requestedAmount = roundByCurrency(input.amount, currency);
    const currentRemaining = roundByCurrency(purchase.remainingAmount || 0, currency);
    const amount = Math.min(requestedAmount, currentRemaining);

    if (amount <= 0) {
      throw new ValidationError('Payment amount exceeds remaining balance', {
        requestedAmount,
        currentRemaining,
      });
    }

    const threshold = currency === 'IQD' ? 0 : 0.01;
    const newPaidAmount = roundByCurrency((purchase.paidAmount || 0) + amount, currency);
    let newRemainingAmount = roundByCurrency(
      Math.max(0, (purchase.total || 0) - newPaidAmount),
      currency
    );
    if (newRemainingAmount < threshold) {
      newRemainingAmount = 0;
    }

    const supplierId = input.supplierId || purchase.supplierId;

    const payment = this.paymentRepo.createSync({
      purchaseId: input.purchaseId,
      supplierId,
      amount,
      currency,
      exchangeRate: input.exchangeRate || purchase.exchangeRate || 1,
      paymentMethod: input.paymentMethod || 'cash',
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      createdBy: userId,
      status: 'completed',
      paymentDate: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    });

    this.updatePurchasePaymentSync(input.purchaseId, newPaidAmount, newRemainingAmount);

    const ledgersEnabled = this.isLedgersEnabled();
    if (ledgersEnabled && supplierId) {
      const balanceBefore = this.supplierLedgerRepo.getLastBalanceSync(supplierId);
      this.supplierLedgerRepo.createSync({
        supplierId,
        transactionType: 'payment',
        amount: -amount,
        balanceAfter: balanceBefore - amount,
        purchaseId: input.purchaseId,
        paymentId: payment.id,
        notes: input.notes || `Payment for purchase #${input.purchaseId}`,
        createdBy: userId,
      });
    }

    if (this.isAccountingEnabled()) {
      this.createPaymentJournalEntry(payment.id!, amount, currency, userId, input.purchaseId);
    }

    const updatedPurchase = this.findPurchaseSync(input.purchaseId);
    if (!updatedPurchase) {
      throw new NotFoundError('Purchase not found after payment update', {
        purchaseId: input.purchaseId,
      });
    }

    return { updatedPurchase };
  }

  private createPaymentJournalEntry(
    paymentId: number,
    amount: number,
    currency: string,
    userId: number,
    purchaseId: number
  ): void {
    const cashAcct = this.accountingRepo.findAccountByCode(ACCT_CASH);
    const apAcct = this.accountingRepo.findAccountByCode(ACCT_AP);
    if (!cashAcct?.id || !apAcct?.id) {
      console.warn('[AddPurchasePaymentUseCase] Missing cash/AP accounts, skipping journal entry');
      return;
    }

    const lines: JournalLine[] = [
      {
        accountId: apAcct.id,
        debit: amount,
        credit: 0,
        description: 'Accounts payable settlement',
      },
      { accountId: cashAcct.id, debit: 0, credit: amount, description: 'Cash paid to supplier' },
    ];

    this.accountingRepo.createJournalEntrySync({
      entryNumber: `JE-PPAY-${paymentId}`,
      entryDate: new Date().toISOString(),
      description: `Supplier payment #${paymentId} for purchase #${purchaseId}`,
      sourceType: 'payment',
      sourceId: paymentId,
      isPosted: false,
      isReversed: false,
      totalAmount: amount,
      currency,
      createdBy: userId,
      lines,
    });
  }

  async execute(input: AddPurchasePaymentInput, userId: number): Promise<Purchase> {
    const result = this.executeCommitPhase(input, userId);
    await this.executeSideEffectsPhase(result, input, userId);
    return result.updatedPurchase;
  }

  async executeSideEffectsPhase(
    result: { updatedPurchase: Purchase },
    input: AddPurchasePaymentInput,
    userId: number
  ): Promise<void> {
    if (!this.auditService) return;
    try {
      await this.auditService.logAction(
        userId,
        'purchase:payment:add',
        'Purchase',
        input.purchaseId,
        `Payment added to purchase #${input.purchaseId}`,
        {
          purchaseId: input.purchaseId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          remainingAmount: result.updatedPurchase.remainingAmount,
        }
      );
    } catch (error) {
      console.warn('Audit logging failed for purchase payment:', error);
    }
  }

  private isAccountingEnabled(): boolean {
    if (!this.settingsRepo) return false;
    const value =
      this.settingsRepo.get(MODULE_SETTING_KEYS.ACCOUNTING_ENABLED) ??
      this.settingsRepo.get('modules.accounting.enabled');
    return value === 'true';
  }

  private isLedgersEnabled(): boolean {
    if (!this.settingsRepo) return true;
    const value =
      this.settingsRepo.get(MODULE_SETTING_KEYS.LEDGERS_ENABLED) ??
      this.settingsRepo.get('modules.ledgers.enabled');
    return value !== 'false';
  }

  private findPurchaseSync(id: number): Purchase | null {
    if (typeof this.purchaseRepo.findByIdSync === 'function') {
      return this.purchaseRepo.findByIdSync(id);
    }
    throw new InvalidStateError(
      'Purchase repository must support synchronous findById for transactional payments'
    );
  }

  private updatePurchasePaymentSync(id: number, paidAmount: number, remainingAmount: number): void {
    if (typeof this.purchaseRepo.updatePaymentSync === 'function') {
      this.purchaseRepo.updatePaymentSync(id, paidAmount, remainingAmount);
      return;
    }
    // Backward-compatible fallback for repositories exposing async signatures only.
    void this.purchaseRepo.updatePayment(id, paidAmount, remainingAmount);
  }
}
