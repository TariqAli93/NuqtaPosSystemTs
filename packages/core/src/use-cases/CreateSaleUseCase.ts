import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { IProductRepository } from '../interfaces/IProductRepository.js';
import { ICustomerRepository } from '../interfaces/ICustomerRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { IAuditRepository } from '../interfaces/IAuditRepository.js';
import { Sale } from '../entities/Sale.js';
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
  interestRate?: number; // percentage
  installmentCount?: number;
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

  async execute(input: CreateSaleInput, userId: number): Promise<Sale> {
    // 1. Validate
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Sale must have at least one item');
    }

    // 2. Get Settings
    const currencySettings = await this.settingsRepo.getCurrencySettings();
    const currency = input.currency || currencySettings.defaultCurrency;

    // 3. Calculate Totals
    const totals = calculateSaleTotals(input.items, input.discount, input.tax);

    // 4. Interest Calculation
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

    // 5. Rounding
    finalTotal = roundByCurrency(finalTotal, currency);
    const paidAmount = roundByCurrency(input.paidAmount || 0, currency);
    // Logic from legacy: if remaining is tiny, treat as 0
    let remainingAmount = Math.max(0, finalTotal - paidAmount);
    const threshold = currency === 'IQD' ? 250 : 0.01;
    if (remainingAmount < threshold) remainingAmount = 0;
    else remainingAmount = roundByCurrency(remainingAmount, currency);

    // 6. Products Stock Check & Update
    const saleItems = [];
    for (const item of input.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product)
        throw new NotFoundError(`Product ${item.productId} not found`, {
          productId: item.productId,
        });
      if (product.stock < item.quantity) {
        throw new InsufficientStockError(`Insufficient stock for ${product.name}`, {
          productId: product.id,
          productName: product.name,
          available: product.stock,
          requested: item.quantity,
        });
      }

      // Update Stock
      await this.productRepo.updateStock(product.id!, -item.quantity);

      if (!product.id) {
        throw new Error(`Product ${product.name} has no ID`);
      }

      saleItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.quantity * item.unitPrice - (item.discount || 0) * item.quantity, // simplified
      });
    }

    // 7. Create Sale Entity
    const saleData: Sale = {
      invoiceNumber: generateInvoiceNumber(),
      customerId: input.customerId,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: finalTotal,
      currency,
      exchangeRate: 1, // Default to 1 for now, or fetch from input/settings
      paymentType: input.paymentType,
      paidAmount,
      remainingAmount,
      status: remainingAmount <= 0 ? 'completed' : 'pending',
      notes: input.notes,
      interestRate: input.interestRate || 0,
      interestAmount: roundByCurrency(interestAmount, currency),
      createdBy: userId,
      items: saleItems,
      createdAt: new Date().toISOString(),
    };

    const createdSale = await this.saleRepo.create(saleData);

    // 8. Create Payment Record if paid
    if (paidAmount > 0) {
      await this.paymentRepo.create({
        saleId: createdSale.id,
        customerId: input.customerId,
        amount: paidAmount,
        currency,
        exchangeRate: 1, // simplified
        paymentMethod: 'cash', // simplified
        createdBy: userId,
      });
    }

    // 9. Update Customer Debt
    if (input.customerId && remainingAmount > 0) {
      await this.customerRepo.updateDebt(input.customerId, remainingAmount);
    }

    // 10. Installments
    if (
      (input.paymentType === 'installment' || input.paymentType === 'mixed') &&
      remainingAmount > 0
    ) {
      const installmentCount = input.installmentCount || 3;
      if (installmentCount < 1)
        throw new ValidationError('Installment count must be at least 1', { installmentCount });

      // Round remainingAmount based on currency before dividing
      // In JS, variables are copied by value for primitives, so we can use remainingAmount directly as it was calculated above

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

      // Add installments to saleData if your repository supports creating them together
      // or call a separate repository method.
      // Assuming Sale entity has 'installments' field or we pass it separately.
      // Looking at Sale.ts (viewed in next step), I need to verify if it has installments.
      // If not, I will add it to the entity type in the next step.
      (saleData as any).installments = installments;
    }

    // Audit logging
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
      // Audit logging should not fail the main operation
      console.warn('Audit logging failed for sale creation:', auditErr);
    }

    return createdSale;
  }
}
