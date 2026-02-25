import { ISupplierLedgerRepository } from '../../interfaces/ISupplierLedgerRepository.js';
import { ISupplierRepository } from '../../interfaces/ISupplierRepository.js';
import { IPaymentRepository } from '../../interfaces/IPaymentRepository.js';
import { IAccountingRepository } from '../../interfaces/IAccountingRepository.js';
import { IAuditRepository } from '../../interfaces/IAuditRepository.js';
import { NotFoundError, ValidationError } from '../../errors/DomainErrors.js';
import { SupplierLedgerEntry } from '../../entities/Ledger.js';
import { AuditService } from '../../services/AuditService.js';

const ACCT_CASH = '1001';
const AP_ACCOUNT_CODES = ['2001', '2100'];

export interface RecordSupplierPaymentInput {
  supplierId: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
  idempotencyKey?: string;
}

export class RecordSupplierPaymentUseCase {
  private auditService?: AuditService;

  constructor(
    private ledgerRepo: ISupplierLedgerRepository,
    private supplierRepo: ISupplierRepository,
    private paymentRepo: IPaymentRepository,
    private accountingRepo: IAccountingRepository,
    auditRepo?: IAuditRepository
  ) {
    if (auditRepo) {
      this.auditService = new AuditService(auditRepo);
    }
  }

  executeCommitPhase(data: RecordSupplierPaymentInput, userId: number): SupplierLedgerEntry {
    if (data.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }
    if (!Number.isInteger(data.amount)) {
      throw new ValidationError('Payment amount must be an integer IQD amount');
    }

    const supplier = this.supplierRepo.findByIdSync(data.supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    if (data.idempotencyKey) {
      const existingPayment = this.paymentRepo.findByIdempotencyKey(data.idempotencyKey);
      if (existingPayment?.id) {
        const existingEntry = this.ledgerRepo.findByPaymentIdSync(existingPayment.id);
        if (existingEntry) return existingEntry;
      }
    }

    const payment = this.paymentRepo.createSync({
      supplierId: data.supplierId,
      amount: data.amount,
      currency: 'IQD',
      exchangeRate: 1,
      paymentMethod: data.paymentMethod as any,
      idempotencyKey: data.idempotencyKey,
      status: 'completed',
      notes: data.notes,
      paymentDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);

    const balanceBefore = this.ledgerRepo.getLastBalanceSync(data.supplierId);
    const balanceAfter = balanceBefore - data.amount;

    const entry = this.ledgerRepo.createSync({
      supplierId: data.supplierId,
      transactionType: 'payment',
      amount: -data.amount,
      balanceAfter,
      paymentId: payment.id,
      notes: data.notes,
      createdBy: userId,
    });

    this.createJournalEntry(payment.id!, data.amount, userId);
    return entry;
  }

  private createJournalEntry(paymentId: number, amount: number, userId: number): void {
    const cashAcct = this.accountingRepo.findAccountByCode(ACCT_CASH);
    const apAcct =
      AP_ACCOUNT_CODES.map((code) => this.accountingRepo.findAccountByCode(code)).find(Boolean) ||
      null;

    if (!cashAcct?.id || !apAcct?.id) {
      console.warn('[RecordSupplierPaymentUseCase] Missing cash/AP accounts, skipping journal');
      return;
    }

    this.accountingRepo.createJournalEntrySync({
      entryNumber: `JE-SPAY-${paymentId}`,
      entryDate: new Date().toISOString(),
      description: `Supplier payment #${paymentId}`,
      sourceType: 'payment',
      sourceId: paymentId,
      isPosted: false,
      isReversed: false,
      totalAmount: amount,
      currency: 'IQD',
      createdBy: userId,
      lines: [
        { accountId: apAcct.id, debit: amount, credit: 0, description: 'AP settled' },
        { accountId: cashAcct.id, debit: 0, credit: amount, description: 'Cash paid' },
      ],
    });
  }

  async execute(data: RecordSupplierPaymentInput, userId = 1): Promise<SupplierLedgerEntry> {
    const result = this.executeCommitPhase(data, userId);
    await this.executeSideEffectsPhase(result, data, userId);
    return result;
  }

  async executeSideEffectsPhase(
    entry: SupplierLedgerEntry,
    data: RecordSupplierPaymentInput,
    userId: number
  ): Promise<void> {
    if (!this.auditService) return;
    try {
      await this.auditService.logAction(
        userId,
        'supplierLedger:payment',
        'Supplier',
        data.supplierId,
        `Recorded supplier payment for supplier #${data.supplierId}`,
        {
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          ledgerEntryId: entry.id,
          paymentId: entry.paymentId,
        }
      );
    } catch (error) {
      console.warn('Audit logging failed for supplier payment:', error);
    }
  }
}
