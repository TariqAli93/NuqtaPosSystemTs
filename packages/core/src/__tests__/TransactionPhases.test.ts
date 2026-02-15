import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSaleUseCase } from '../use-cases/CreateSaleUseCase';
import { AddPaymentUseCase } from '../use-cases/AddPaymentUseCase';
import {
  FakeProductRepository,
  FakeSaleRepository,
  FakeCustomerRepository,
  FakeSettingsRepository,
  FakePaymentRepository,
  FakeAuditRepository,
} from './fakes';
import { AuditEvent } from '../entities/AuditEvent';

class CountingAuditRepository extends FakeAuditRepository {
  createCalls = 0;

  override create(event: AuditEvent): AuditEvent {
    this.createCalls += 1;
    return event;
  }
}

describe('Transaction phase behavior', () => {
  let productRepo: FakeProductRepository;
  let saleRepo: FakeSaleRepository;
  let customerRepo: FakeCustomerRepository;
  let settingsRepo: FakeSettingsRepository;
  let paymentRepo: FakePaymentRepository;
  let auditRepo: CountingAuditRepository;

  beforeEach(() => {
    productRepo = new FakeProductRepository();
    saleRepo = new FakeSaleRepository();
    customerRepo = new FakeCustomerRepository();
    settingsRepo = new FakeSettingsRepository();
    paymentRepo = new FakePaymentRepository();
    auditRepo = new CountingAuditRepository();
  });

  it('CreateSale commit phase performs DB writes and defers side effects', async () => {
    const product = productRepo.create({
      name: 'Widget',
      costPrice: 10,
      sellingPrice: 20,
      stock: 100,
      currency: 'USD',
      minStock: 0,
      unit: 'piece',
      isActive: true,
      status: 'available',
    });

    const useCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      auditRepo
    );

    const commitResult = useCase.executeCommitPhase(
      {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 20 }],
        paymentType: 'cash',
        paidAmount: 40,
      },
      1
    );

    expect(commitResult.createdSale.id).toBeDefined();
    expect(auditRepo.createCalls).toBe(0);

    await useCase.executeSideEffectsPhase(commitResult);
    expect(auditRepo.createCalls).toBe(1);
  });

  it('AddPayment commit phase updates sale and records payment', () => {
    const sale = saleRepo.create({
      invoiceNumber: 'INV-TEST-1',
      customerId: 1,
      subtotal: 500,
      discount: 0,
      tax: 0,
      total: 500,
      currency: 'USD',
      exchangeRate: 1,
      interestRate: 0,
      interestAmount: 0,
      paymentType: 'cash',
      paidAmount: 0,
      remainingAmount: 500,
      status: 'pending',
      createdBy: 1,
      items: [],
    });

    const useCase = new AddPaymentUseCase(saleRepo, paymentRepo, customerRepo);

    const commitResult = useCase.executeCommitPhase(
      {
        saleId: sale.id!,
        amount: 200,
        paymentMethod: 'cash',
      },
      1
    );

    expect(commitResult.updatedSale.paidAmount).toBe(200);
    expect(commitResult.updatedSale.remainingAmount).toBe(300);
    expect(paymentRepo.findBySaleId(sale.id!).length).toBe(1);
  });
});
