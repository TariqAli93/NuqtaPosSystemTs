import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { ICustomerRepository } from '../interfaces/ICustomerRepository.js';
import { NotFoundError, InvalidStateError, ValidationError } from '../errors/DomainErrors.js';
import { roundByCurrency } from '../utils/helpers.js';
import { Sale } from '../entities/Sale.js';

export interface AddPaymentInput {
  saleId: number;
  customerId?: number;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
}

export interface AddPaymentCommitResult {
  updatedSale: Sale;
}

export class AddPaymentUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private paymentRepo: IPaymentRepository,
    private customerRepo: ICustomerRepository
  ) {}

  executeCommitPhase(input: AddPaymentInput, userId: number): AddPaymentCommitResult {
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

    const currency = sale.currency || 'USD';
    const amount = roundByCurrency(input.amount, currency);
    const saleRemaining = roundByCurrency(sale.remainingAmount, currency);

    const actualPaymentAmount = Math.min(amount, saleRemaining);

    this.paymentRepo.create({
      saleId: sale.id!,
      customerId: sale.customerId || undefined,
      amount: actualPaymentAmount,
      currency: input.currency || currency,
      exchangeRate: input.exchangeRate || sale.exchangeRate,
      paymentMethod: input.paymentMethod || 'cash',
      notes: input.notes,
      createdBy: userId,
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

    if (sale.customerId) {
      this.customerRepo.updateDebt(sale.customerId, -actualPaymentAmount);
    }

    const updatedSale = this.saleRepo.findById(sale.id!);
    if (!updatedSale) {
      throw new NotFoundError('Sale not found after payment update', { saleId: sale.id });
    }

    return { updatedSale };
  }

  async execute(input: AddPaymentInput, userId: number): Promise<Sale> {
    return this.executeCommitPhase(input, userId).updatedSale;
  }
}
