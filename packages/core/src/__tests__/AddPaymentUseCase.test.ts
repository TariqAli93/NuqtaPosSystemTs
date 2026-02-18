import { beforeEach, describe, expect, it } from 'vitest';
import { AddPaymentUseCase } from '../use-cases/AddPaymentUseCase';
import {
  FakeSaleRepository,
  FakePaymentRepository,
  FakeCustomerRepository,
  FakeCustomerLedgerRepository,
  FakeAccountingRepository,
} from './fakes';
import type { Account } from '../entities/Accounting';

function paymentAccounts(): Account[] {
  return [
    {
      id: 1,
      code: '1001',
      name: 'Cash',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 2,
      code: '1100',
      name: 'Accounts Receivable',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
  ];
}

describe('AddPaymentUseCase', () => {
  let saleRepo: FakeSaleRepository;
  let paymentRepo: FakePaymentRepository;
  let customerRepo: FakeCustomerRepository;
  let customerLedgerRepo: FakeCustomerLedgerRepository;
  let accountingRepo: FakeAccountingRepository;
  let useCase: AddPaymentUseCase;

  beforeEach(() => {
    saleRepo = new FakeSaleRepository();
    paymentRepo = new FakePaymentRepository();
    customerRepo = new FakeCustomerRepository();
    customerLedgerRepo = new FakeCustomerLedgerRepository();
    accountingRepo = new FakeAccountingRepository();
    accountingRepo.seedAccounts(paymentAccounts());

    useCase = new AddPaymentUseCase(
      saleRepo,
      paymentRepo,
      customerRepo,
      customerLedgerRepo,
      accountingRepo
    );
  });

  it('is idempotent for payment retries', async () => {
    const customer = customerRepo.create({
      name: 'Customer A',
      isActive: true,
      totalDebt: 0,
      totalPurchases: 0,
    });

    const sale = saleRepo.create({
      invoiceNumber: 'INV-RET-1',
      customerId: customer.id,
      subtotal: 10_000,
      discount: 0,
      tax: 0,
      total: 10_000,
      currency: 'IQD',
      exchangeRate: 1,
      paymentType: 'credit',
      paidAmount: 0,
      remainingAmount: 10_000,
      status: 'pending',
      interestRate: 0,
      interestAmount: 0,
      items: [],
      createdBy: 1,
    });

    const input = {
      saleId: sale.id!,
      customerId: customer.id,
      amount: 2_500,
      paymentMethod: 'cash' as const,
      idempotencyKey: 'payment-idem-1',
    };

    const first = await useCase.execute(input, 1);
    const second = await useCase.execute(input, 1);

    expect(first.id).toBe(second.id);
    expect(paymentRepo.findBySaleId(sale.id!)).toHaveLength(1);
    expect(customerLedgerRepo.entries).toHaveLength(1);
    expect(accountingRepo.entries).toHaveLength(1);

    const updated = saleRepo.findById(sale.id!);
    expect(updated?.paidAmount).toBe(2_500);
    expect(updated?.remainingAmount).toBe(7_500);
  });
});
