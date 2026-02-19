import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { ICustomerRepository } from '../interfaces/ICustomerRepository.js';
import { ICustomerLedgerRepository } from '../interfaces/ICustomerLedgerRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { NotFoundError, InvalidStateError, ValidationError } from '../errors/DomainErrors.js';
import { roundByCurrency } from '../utils/helpers.js';
import { Sale } from '../entities/Sale.js';
import type { PaymentMethod } from '../entities/Payment.js';
import type { JournalLine } from '../entities/Accounting.js';

const ACCT_CASH = '1001';
const ACCT_AR = '1100';

export interface AddPaymentInput {
  saleId: number;
  customerId?: number;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface AddPaymentCommitResult {
  updatedSale: Sale;
}

export class AddPaymentUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private paymentRepo: IPaymentRepository,
    private customerRepo: ICustomerRepository,
    private customerLedgerRepo: ICustomerLedgerRepository,
    private accountingRepo: IAccountingRepository,
    private settingsRepo?: ISettingsRepository
  ) {}

  executeCommitPhase(input: AddPaymentInput, userId: number): AddPaymentCommitResult {
    if (input.idempotencyKey) {
      const existingPayment = this.paymentRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existingPayment?.saleId) {
        const existingSale = this.saleRepo.findById(existingPayment.saleId);
        if (existingSale) {
          return { updatedSale: existingSale };
        }
      }
    }

    const sale = this.saleRepo.findById(input.saleId);
    if (!sale) throw new NotFoundError('Sale not found', { saleId: input.saleId });

    if (sale.status === 'cancelled') {
      throw new InvalidStateError('Cannot add payment to cancelled sale', {
        saleId: sale.id,
        status: sale.status,
      });
    }

    if (sale.remainingAmount <= 0) {
      throw new InvalidStateError('Sale is already fully paid', { saleId: sale.id });
    }

    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero', {
        amount: input.amount,
      });
    }

    if (input.paymentMethod === 'card' && !input.referenceNumber?.trim()) {
      throw new ValidationError('Card payments require a reference number');
    }

    if (input.paymentMethod === 'credit' && !sale.customerId && !input.customerId) {
      throw new ValidationError('Credit/debt payments require a customer');
    }

    const currency = sale.currency || 'IQD';
    const amount = roundByCurrency(input.amount, currency);
    const saleRemaining = roundByCurrency(sale.remainingAmount, currency);

    const actualPaymentAmount = Math.min(amount, saleRemaining);

    const payment = this.paymentRepo.createSync({
      saleId: sale.id!,
      customerId: sale.customerId || input.customerId || undefined,
      amount: actualPaymentAmount,
      currency: input.currency || currency,
      exchangeRate: input.exchangeRate || sale.exchangeRate,
      paymentMethod: input.paymentMethod || 'cash',
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      createdBy: userId,
      status: 'completed',
      paymentDate: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    });

    const newPaidAmount = roundByCurrency(sale.paidAmount + actualPaymentAmount, currency);
    let newRemainingAmount = roundByCurrency(sale.remainingAmount - actualPaymentAmount, currency);

    const threshold = currency === 'IQD' ? 250 : 0.01;
    if (newRemainingAmount < threshold) newRemainingAmount = 0;

    const newStatus = newRemainingAmount <= 0 ? 'completed' : 'pending';

    this.saleRepo.update(sale.id!, {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    const accountingEnabled = this.isAccountingEnabled();
    const effectiveCustomerId = sale.customerId || input.customerId;
    if (accountingEnabled && effectiveCustomerId) {
      const balanceBefore = this.customerLedgerRepo.getLastBalanceSync(effectiveCustomerId);
      this.customerLedgerRepo.createSync({
        customerId: effectiveCustomerId,
        transactionType: 'payment',
        amount: -actualPaymentAmount,
        balanceAfter: balanceBefore - actualPaymentAmount,
        saleId: sale.id,
        paymentId: payment.id,
        notes: input.notes || `Payment for sale #${sale.invoiceNumber}`,
        createdBy: userId,
      });
    } else if (accountingEnabled) {
      // Keep compatibility for older aggregate fields if no ledger customer link exists.
      if (sale.customerId) {
        this.customerRepo.updateDebt(sale.customerId, -actualPaymentAmount);
      }
    }

    if (accountingEnabled) {
      this.createPaymentJournalEntry(payment.id!, actualPaymentAmount, currency, userId);
    }

    const updatedSale = this.saleRepo.findById(sale.id!);
    if (!updatedSale) {
      throw new NotFoundError('Sale not found after payment update', { saleId: sale.id });
    }

    return { updatedSale };
  }

  private createPaymentJournalEntry(
    paymentId: number,
    amount: number,
    currency: string,
    userId: number
  ): void {
    const cashAcct = this.accountingRepo.findAccountByCode(ACCT_CASH);
    const arAcct = this.accountingRepo.findAccountByCode(ACCT_AR);

    if (!cashAcct?.id || !arAcct?.id) {
      console.warn('[AddPaymentUseCase] Missing cash/AR accounts, skipping journal entry');
      return;
    }

    const lines: JournalLine[] = [
      {
        accountId: cashAcct.id,
        debit: amount,
        credit: 0,
        description: 'Cash received',
      },
      {
        accountId: arAcct.id,
        debit: 0,
        credit: amount,
        description: 'Accounts receivable settlement',
      },
    ];

    this.accountingRepo.createJournalEntrySync({
      entryNumber: `JE-PAY-${paymentId}`,
      entryDate: new Date().toISOString(),
      description: `Customer payment #${paymentId}`,
      sourceType: 'payment',
      sourceId: paymentId,
      isPosted: true,
      isReversed: false,
      totalAmount: amount,
      currency,
      createdBy: userId,
      lines,
    });
  }

  async execute(input: AddPaymentInput, userId: number): Promise<Sale> {
    return this.executeCommitPhase(input, userId).updatedSale;
  }

  private isAccountingEnabled(): boolean {
    if (!this.settingsRepo) return true;
    const value = this.settingsRepo.get('accounting.enabled');
    return value !== 'false';
  }
}
