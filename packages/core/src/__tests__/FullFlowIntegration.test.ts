import { describe, it, expect } from 'vitest';
import { CreateSaleUseCase, ValidationError } from '@nuqtaplus/core';
import {
  FakeSaleRepository,
  FakeProductRepository,
  FakeCustomerRepository,
  FakeSettingsRepository,
  FakePaymentRepository,
  FakeInventoryRepository,
  FakeAccountingRepository,
  FakeCustomerLedgerRepository,
  FakeAuditRepository,
} from './fakes';

describe('FullFlowIntegration', () => {
  it('creates a cash sale end-to-end through repositories', async () => {
    const saleRepo = new FakeSaleRepository();
    const productRepo = new FakeProductRepository();
    const customerRepo = new FakeCustomerRepository();
    const settingsRepo = new FakeSettingsRepository();
    const paymentRepo = new FakePaymentRepository();
    const inventoryRepo = new FakeInventoryRepository();
    const accountingRepo = new FakeAccountingRepository();
    const customerLedgerRepo = new FakeCustomerLedgerRepository();
    const auditRepo = new FakeAuditRepository();

    const useCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      inventoryRepo,
      accountingRepo,
      customerLedgerRepo,
      auditRepo
    );

    const product = productRepo.create({
      name: 'Notebook',
      sku: 'NB-001',
      costPrice: 1000,
      sellingPrice: 1500,
      stock: 20,
      currency: 'IQD',
      isActive: true,
    } as any);

    const sale = await useCase.execute(
      {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 1500 }],
        paymentType: 'cash',
        paidAmount: 3000,
      },
      1
    );

    expect(sale.id).toBeDefined();
    expect(sale.status).toBe('completed');
    expect(inventoryRepo.movements.length).toBe(1);
    expect(productRepo.findById(product.id!)?.stock).toBe(18);
  });

  it('throws typed validation error for empty sale items', async () => {
    const useCase = new CreateSaleUseCase(
      new FakeSaleRepository(),
      new FakeProductRepository(),
      new FakeCustomerRepository(),
      new FakeSettingsRepository(),
      new FakePaymentRepository(),
      new FakeInventoryRepository(),
      new FakeAccountingRepository(),
      new FakeCustomerLedgerRepository(),
      new FakeAuditRepository()
    );

    await expect(
      useCase.execute(
        {
          items: [],
          paymentType: 'cash',
        },
        1
      )
    ).rejects.toThrow(ValidationError);
  });
});

