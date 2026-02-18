import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSaleUseCase, CreateSaleInput } from '../use-cases/CreateSaleUseCase';
import {
  FakeProductRepository,
  FakeSaleRepository,
  FakeCustomerRepository,
  FakeSettingsRepository,
  FakePaymentRepository,
  FakeInventoryRepository,
  FakeAccountingRepository,
  FakeCustomerLedgerRepository,
  FakeAuditRepository,
} from './fakes';
import { Account } from '../entities/Accounting';

// â”€â”€â”€ Test helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createTestAccounts(): Account[] {
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
      name: 'AR',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 3,
      code: '4001',
      name: 'Revenue',
      accountType: 'revenue',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 4,
      code: '5001',
      name: 'COGS',
      accountType: 'expense',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 5,
      code: '1200',
      name: 'Inventory',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
  ];
}

// â”€â”€â”€ Suite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('CreateSaleUseCase', () => {
  let productRepo: FakeProductRepository;
  let saleRepo: FakeSaleRepository;
  let customerRepo: FakeCustomerRepository;
  let settingsRepo: FakeSettingsRepository;
  let paymentRepo: FakePaymentRepository;
  let inventoryRepo: FakeInventoryRepository;
  let accountingRepo: FakeAccountingRepository;
  let ledgerRepo: FakeCustomerLedgerRepository;
  let auditRepo: FakeAuditRepository;
  let useCase: CreateSaleUseCase;

  const USER_ID = 1;

  beforeEach(() => {
    productRepo = new FakeProductRepository();
    saleRepo = new FakeSaleRepository();
    customerRepo = new FakeCustomerRepository();
    settingsRepo = new FakeSettingsRepository();
    paymentRepo = new FakePaymentRepository();
    inventoryRepo = new FakeInventoryRepository();
    accountingRepo = new FakeAccountingRepository();
    ledgerRepo = new FakeCustomerLedgerRepository();
    auditRepo = new FakeAuditRepository();

    accountingRepo.seedAccounts(createTestAccounts());

    useCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      inventoryRepo,
      accountingRepo,
      ledgerRepo,
      auditRepo
    );
  });

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function seedProduct(stock: number = 100, sellingPrice: number = 5000, costPrice: number = 3000) {
    return productRepo.create({
      name: 'Test Product',
      sku: 'TP-001',
      costPrice,
      sellingPrice,
      stock,
      minStock: 5,
      unit: 'piece',
      currency: 'IQD',
      isExpire: false,
      isActive: true,
      status: 'available',
    });
  }

  function seedCustomer(totalDebt: number = 0) {
    return customerRepo.create({
      name: 'Test Customer',
      phone: '1234567890',
      isActive: true,
      totalDebt,
      totalPurchases: 0,
    });
  }

  function cashSaleInput(productId: number, quantity: number = 2): CreateSaleInput {
    return {
      items: [{ productId, quantity, unitPrice: 5000 }],
      paymentType: 'cash',
      paidAmount: quantity * 5000,
    };
  }

  // â”€â”€ 1. Cash sale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Cash sale', () => {
    it('creates sale, decrements stock, creates inventory movement', async () => {
      const product = seedProduct(50);

      const sale = await useCase.execute(cashSaleInput(product.id!, 3), USER_ID);

      expect(sale.id).toBeDefined();
      expect(sale.total).toBe(15000);
      expect(sale.status).toBe('completed');
      expect(sale.remainingAmount).toBe(0);

      // Stock decremented
      const updatedProduct = productRepo.findById(product.id!);
      expect(updatedProduct!.stock).toBe(47); // 50 â€“ 3

      // Inventory movement created
      expect(inventoryRepo.movements).toHaveLength(1);
      const mov = inventoryRepo.movements[0];
      expect(mov.movementType).toBe('out');
      expect(mov.reason).toBe('sale');
      expect(mov.quantityBase).toBe(3);
      expect(mov.stockBefore).toBe(50);
      expect(mov.stockAfter).toBe(47);

      // Payment created
      const payments = paymentRepo.findBySaleId(sale.id!);
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(15000);
    });

    it('creates journal entry with Cash debit and Revenue credit', async () => {
      const product = seedProduct(50);

      await useCase.execute(cashSaleInput(product.id!, 2), USER_ID);

      expect(accountingRepo.entries).toHaveLength(1);
      const journal = accountingRepo.entries[0];
      expect(journal.sourceType).toBe('sale');
      expect(journal.lines).toBeDefined();

      const lines = journal.lines!;
      // Revenue credit
      const revenueLine = lines.find((l) => l.accountId === 3); // code 4001
      expect(revenueLine?.credit).toBe(10000);
      // Cash debit
      const cashLine = lines.find((l) => l.accountId === 1); // code 1001
      expect(cashLine?.debit).toBe(10000);
      // COGS debit (3000 cost Ã— 2 units)
      const cogsLine = lines.find((l) => l.accountId === 4); // code 5001
      expect(cogsLine?.debit).toBe(6000);
      // Inventory credit
      const invLine = lines.find((l) => l.accountId === 5); // code 1200
      expect(invLine?.credit).toBe(6000);

      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      expect(totalDebit).toBe(totalCredit);
    });
  });

  // â”€â”€ 2. Credit sale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Credit sale', () => {
    it('creates customer ledger entry and AR journal line', async () => {
      const product = seedProduct(50);
      const customer = seedCustomer(0);

      const input: CreateSaleInput = {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 5000 }],
        customerId: customer.id!,
        paymentType: 'credit',
        paidAmount: 0,
      };

      const sale = await useCase.execute(input, USER_ID);

      expect(sale.status).toBe('pending');
      expect(sale.remainingAmount).toBe(10000);

      // Customer ledger entry created
      expect(ledgerRepo.entries).toHaveLength(1);
      const ledgerEntry = ledgerRepo.entries[0];
      expect(ledgerEntry.transactionType).toBe('invoice');
      expect(ledgerEntry.amount).toBe(10000);
      expect(ledgerEntry.customerId).toBe(customer.id!);

      // Journal has AR debit instead of cash
      const journal = accountingRepo.entries[0];
      const arLine = journal.lines!.find((l) => l.accountId === 2); // code 1100
      expect(arLine?.debit).toBe(10000);
      // No cash line
      const cashLine = journal.lines!.find((l) => l.accountId === 1);
      expect(cashLine).toBeUndefined();
    });
  });

  // â”€â”€ 3. Mixed sale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Mixed sale', () => {
    it('creates both Cash and AR journal lines for partial payment', async () => {
      const product = seedProduct(50);
      const customer = seedCustomer(0);

      const input: CreateSaleInput = {
        items: [{ productId: product.id!, quantity: 4, unitPrice: 5000 }],
        customerId: customer.id!,
        paymentType: 'mixed',
        paidAmount: 12000,
      };

      const sale = await useCase.execute(input, USER_ID);

      expect(sale.total).toBe(20000);
      expect(sale.paidAmount).toBe(12000);
      expect(sale.remainingAmount).toBe(8000);

      // Customer ledger for remaining
      expect(ledgerRepo.entries).toHaveLength(1);
      expect(ledgerRepo.entries[0].amount).toBe(8000);

      // Journal
      const journal = accountingRepo.entries[0];
      const cashLine = journal.lines!.find((l) => l.accountId === 1);
      const arLine = journal.lines!.find((l) => l.accountId === 2);
      expect(cashLine?.debit).toBe(12000);
      expect(arLine?.debit).toBe(8000);
    });
  });

  // â”€â”€ 4. Idempotency â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Idempotency', () => {
    it('returns existing sale without creating duplicates', async () => {
      const product = seedProduct(50);
      const key = 'idem-key-001';

      const input = { ...cashSaleInput(product.id!, 2), idempotencyKey: key };

      const sale1 = await useCase.execute(input, USER_ID);
      const sale2 = await useCase.execute(input, USER_ID);

      expect(sale1.id).toBe(sale2.id);
      expect(sale1.invoiceNumber).toBe(sale2.invoiceNumber);

      // Only ONE sale created
      const allSales = saleRepo.findAll();
      expect(allSales.total).toBe(1);

      // Only ONE inventory movement
      expect(inventoryRepo.movements).toHaveLength(1);

      // Only ONE journal entry
      expect(accountingRepo.entries).toHaveLength(1);
    });
  });

  // â”€â”€ 5. Insufficient stock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Insufficient stock', () => {
    it('throws InsufficientStockError when stock is too low', async () => {
      const product = seedProduct(5); // only 5 in stock

      const input = cashSaleInput(product.id!, 10); // requesting 10

      await expect(useCase.execute(input, USER_ID)).rejects.toThrow('Insufficient stock');

      // No side effects
      expect(saleRepo.findAll().total).toBe(0);
      expect(inventoryRepo.movements).toHaveLength(0);
    });
  });

  // â”€â”€ 6. Validation errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Validation', () => {
    it('throws when items array is empty', async () => {
      const input: CreateSaleInput = {
        items: [],
        paymentType: 'cash',
        paidAmount: 0,
      };

      await expect(useCase.execute(input, USER_ID)).rejects.toThrow('at least one item');
    });

    it('throws when product not found', async () => {
      const input = cashSaleInput(99999);

      await expect(useCase.execute(input, USER_ID)).rejects.toThrow('not found');
    });
  });

  // â”€â”€ 7. Multi-item sale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Multi-item sale', () => {
    it('creates one inventory movement per item', async () => {
      const product1 = seedProduct(50, 5000, 3000);
      const product2 = productRepo.create({
        name: 'Product 2',
        sku: 'TP-002',
        costPrice: 2000,
        sellingPrice: 4000,
        stock: 30,
        minStock: 5,
        unit: 'piece',
        currency: 'IQD',
        isExpire: false,
        isActive: true,
        status: 'available',
      });

      const input: CreateSaleInput = {
        items: [
          { productId: product1.id!, quantity: 2, unitPrice: 5000 },
          { productId: product2.id!, quantity: 3, unitPrice: 4000 },
        ],
        paymentType: 'cash',
        paidAmount: 22000,
      };

      const sale = await useCase.execute(input, USER_ID);

      expect(sale.total).toBe(22000);
      expect(inventoryRepo.movements).toHaveLength(2);

      expect(productRepo.findById(product1.id!)!.stock).toBe(48);
      expect(productRepo.findById(product2.id!)!.stock).toBe(27);

      // COGS: (2 Ã— 3000) + (3 Ã— 2000) = 12000
      const cogsLine = accountingRepo.entries[0].lines!.find((l) => l.accountId === 4);
      expect(cogsLine?.debit).toBe(12000);
    });
  });

  // â”€â”€ 8. Unit factors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Unit factors', () => {
    it('multiplies quantity by unitFactor for stock calculation', async () => {
      const product = seedProduct(48); // 48 pieces

      const input: CreateSaleInput = {
        items: [
          {
            productId: product.id!,
            quantity: 2,
            unitPrice: 15000,
            unitName: 'carton',
            unitFactor: 12, // 1 carton = 12 pieces
          },
        ],
        paymentType: 'cash',
        paidAmount: 30000,
      };

      const sale = await useCase.execute(input, USER_ID);

      expect(sale.total).toBe(30000);

      // Stock decremented by 2 Ã— 12 = 24
      expect(productRepo.findById(product.id!)!.stock).toBe(24);

      // Inventory movement shows base qty
      expect(inventoryRepo.movements[0].quantityBase).toBe(24);
    });
  });

  // â”€â”€ 9. Journal entry skipped when no accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Batch handling', () => {
    it('applies batch stock update when batchId is provided', async () => {
      const product = seedProduct(50);

      await useCase.execute(
        {
          items: [
            {
              productId: product.id!,
              quantity: 3,
              unitPrice: 5000,
              batchId: 42,
            },
          ],
          paymentType: 'cash',
          paidAmount: 15000,
        },
        USER_ID
      );

      expect(productRepo.batchStockUpdates).toHaveLength(1);
      expect(productRepo.batchStockUpdates[0]).toEqual({
        batchId: 42,
        quantityChange: -3,
      });
    });
  });

  describe('No chart of accounts', () => {
    it('skips journal entry when accounts are not seeded', async () => {
      accountingRepo.seedAccounts([]); // clear accounts

      const product = seedProduct(50);
      const sale = await useCase.execute(cashSaleInput(product.id!, 2), USER_ID);

      expect(sale.id).toBeDefined();
      // Journal entry NOT created
      expect(accountingRepo.entries).toHaveLength(0);

      // But everything else still works
      expect(inventoryRepo.movements).toHaveLength(1);
      expect(productRepo.findById(product.id!)!.stock).toBe(48);
    });
  });

  // â”€â”€ 10. Credit with interest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Credit + interest', () => {
    it('applies interest to credit sales', async () => {
      const product = seedProduct(50);
      const customer = seedCustomer(0);

      const input: CreateSaleInput = {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 5000 }],
        customerId: customer.id!,
        paymentType: 'credit',
        paidAmount: 0,
        interestRate: 10, // 10%
      };

      const sale = await useCase.execute(input, USER_ID);

      // 10000 + 10% = 11000
      expect(sale.total).toBe(11000);
      expect(sale.interestAmount).toBe(1000);
      expect(sale.remainingAmount).toBe(11000);
    });
  });
});
