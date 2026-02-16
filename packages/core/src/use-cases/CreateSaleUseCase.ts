import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { IProductRepository } from '../interfaces/IProductRepository.js';
import { ICustomerRepository } from '../interfaces/ICustomerRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { IAuditRepository } from '../interfaces/IAuditRepository.js';
import { Sale } from '../entities/Sale.js';
import type { PaymentMethod } from '../entities/Payment.js';
import { ValidationError, NotFoundError, InsufficientStockError } from '../errors/DomainErrors.js';
import { AuditService } from '../services/AuditService.js';
import { generateInvoiceNumber, calculateSaleTotals, roundByCurrency } from '../utils/helpers.js';

export interface CreateSaleInput {
  items: { productId: number; quantity: number; unitPrice: number; discount?: number }[];
  customerId?: number;
  discount?: number;
  tax?: number;
  paymentType: 'cash' | 'installment' | 'mixed';
  paidAmount?: number;
  currency?: string;
  notes?: string;
  interestRate?: number;
  installmentCount?: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
}

export interface CreateSaleCommitResult {
  createdSale: Sale;
  userId: number;
  currency: string;
}

export class CreateSaleUseCase {
  private auditService: AuditService;

  constructor(
    private saleRepo: ISaleRepository,
    private productRepo: IProductRepository,
    private customerRepo: ICustomerRepository,
    private settingsRepo: ISettingsRepository,
    private paymentRepo: IPaymentRepository,
    auditRepo?: IAuditRepository
  ) {
    this.auditService = new AuditService(auditRepo as IAuditRepository);
  }

  executeCommitPhase(input: CreateSaleInput, userId: number): CreateSaleCommitResult {
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
    const totals = calculateSaleTotals(input.items, input.discount, input.tax);

    let interestAmount = 0;
    let finalTotal = totals.total;
    if (
      (input.paymentType === 'installment' || input.paymentType === 'mixed') &&
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

    const saleItems = [];
    for (const item of input.items) {
      const product = this.productRepo.findById(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`, {
          productId: item.productId,
        });
      }
      if (product.stock < item.quantity) {
        throw new InsufficientStockError(`Insufficient stock for ${product.name}`, {
          productId: product.id,
          productName: product.name,
          available: product.stock,
          requested: item.quantity,
        });
      }

      if (!product.id) {
        throw new Error(`Product ${product.name} has no ID`);
      }

      this.productRepo.updateStock(product.id, -item.quantity);

      saleItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.quantity * item.unitPrice - (item.discount || 0) * item.quantity,
      });
    }

    let saleInstallments: Sale['installments'];
    if (
      (input.paymentType === 'installment' || input.paymentType === 'mixed') &&
      remainingAmount > 0
    ) {
      const installmentCount = input.installmentCount || 3;
      if (installmentCount < 1) {
        throw new ValidationError('Installment count must be at least 1', { installmentCount });
      }

      const baseInstallmentAmount = roundByCurrency(remainingAmount / installmentCount, currency);
      const totalWithBaseAmount = baseInstallmentAmount * installmentCount;
      const adjustment = totalWithBaseAmount - remainingAmount;

      const currentDate = new Date();
      const installments = [];

      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(currentDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);

        const isLastInstallment = i === installmentCount - 1;
        const installmentAmount = isLastInstallment
          ? baseInstallmentAmount - adjustment
          : baseInstallmentAmount;

        const roundedAmount = roundByCurrency(installmentAmount, currency);

        installments.push({
          installmentNumber: i + 1,
          dueAmount: roundedAmount,
          paidAmount: 0,
          remainingAmount: roundedAmount,
          currency,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending' as const,
        });
      }

      saleInstallments = installments;
    }

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
      createdBy: userId,
      items: saleItems,
      installments: saleInstallments,
      createdAt: new Date().toISOString(),
    };

    const createdSale = this.saleRepo.create(saleData);

    if (paidAmount > 0) {
      this.paymentRepo.create({
        saleId: createdSale.id,
        customerId: input.customerId,
        amount: paidAmount,
        currency,
        exchangeRate: 1,
        paymentMethod: input.paymentMethod || 'cash',
        referenceNumber: input.referenceNumber,
        createdBy: userId,
      });
    }

    if (input.customerId && remainingAmount > 0) {
      this.customerRepo.updateDebt(input.customerId, remainingAmount);
    }

    return {
      createdSale,
      userId,
      currency,
    };
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
