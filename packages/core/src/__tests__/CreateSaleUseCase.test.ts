import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSaleUseCase, CreateSaleInput } from '../use-cases/CreateSaleUseCase';
import {
  FakeProductRepository,
  FakeSaleRepository,
  FakeCustomerRepository,
  FakeSettingsRepository,
  FakePaymentRepository,
  FakeAuditRepository,
} from './fakes';
import { InsufficientStockError } from '../errors/DomainErrors';

describe('CreateSaleUseCase', () => {
  let productRepo: FakeProductRepository;
  let saleRepo: FakeSaleRepository;
  let customerRepo: FakeCustomerRepository;
  let settingsRepo: FakeSettingsRepository;
  let paymentRepo: FakePaymentRepository;
  let auditRepo: FakeAuditRepository;
  let useCase: CreateSaleUseCase;

  beforeEach(async () => {
    productRepo = new FakeProductRepository();
    saleRepo = new FakeSaleRepository();
    customerRepo = new FakeCustomerRepository();
    settingsRepo = new FakeSettingsRepository();
    paymentRepo = new FakePaymentRepository();
    auditRepo = new FakeAuditRepository();

    useCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      auditRepo
    );

    // Seed a product
    await productRepo.create({
      name: 'Apple',
      costPrice: 0.5,
      sellingPrice: 1.0,
      stock: 100,
      currency: 'USD',
      minStock: 0,
      unit: 'kg',
      isActive: true,
      status: 'available',
    });
  });

  it('should successfully create a cash sale', async () => {
    const input: CreateSaleInput = {
      items: [{ productId: 1, quantity: 2, unitPrice: 1.0 }],
      paymentType: 'cash',
      currency: 'USD',
      paidAmount: 2.0,
    };

    const sale = await useCase.execute(input, 1); // userId 1

    expect(sale.id).toBeDefined();
    expect(sale.total).toBe(2.0);
    expect(sale.status).toBe('completed');

    // Check product stock reduction
    const product = await productRepo.findById(1);
    expect(product?.stock).toBe(98);
  });

  it('should throw InsufficientStockError if quantity exceeds stock', async () => {
    const input: CreateSaleInput = {
      items: [{ productId: 1, quantity: 101, unitPrice: 1.0 }],
      paymentType: 'cash',
      currency: 'USD',
    };

    await expect(useCase.execute(input, 1)).rejects.toThrow(InsufficientStockError);
  });
});
