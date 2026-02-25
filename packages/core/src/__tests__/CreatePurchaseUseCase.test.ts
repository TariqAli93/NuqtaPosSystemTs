import { beforeEach, describe, expect, it } from 'vitest';
import { CreatePurchaseUseCase } from '../use-cases/CreatePurchaseUseCase';
import type { IPurchaseRepository } from '../interfaces/IPurchaseRepository';
import type { ISupplierRepository } from '../interfaces/ISupplierRepository';
import type { ISupplierLedgerRepository } from '../interfaces/ISupplierLedgerRepository';
import type { Purchase } from '../entities/Purchase';
import type { Supplier } from '../entities/Supplier';
import type { SupplierLedgerEntry } from '../entities/Ledger';
import { FakePaymentRepository, FakeAccountingRepository } from './fakes';
import type { Account } from '../entities/Accounting';

class FakePurchaseRepository implements IPurchaseRepository {
  items: Purchase[] = [];
  private idCounter = 1;

  async create(purchase: Purchase): Promise<Purchase> {
    return this.createSync(purchase);
  }

  createSync(purchase: Purchase): Purchase {
    const created = {
      ...purchase,
      id: this.idCounter++,
    };
    this.items.push(created);
    return created;
  }

  findByIdempotencyKey(key: string): Purchase | null {
    return this.items.find((item) => item.idempotencyKey === key) || null;
  }

  async findAll(): Promise<{ items: Purchase[]; total: number }> {
    return { items: this.items, total: this.items.length };
  }

  async findById(id: number): Promise<Purchase | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  findByIdSync(id: number): Purchase | null {
    return this.items.find((item) => item.id === id) || null;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    const item = this.items.find((p) => p.id === id);
    if (item) item.status = status as any;
  }

  updateStatusSync(id: number, status: string): void {
    const item = this.items.find((p) => p.id === id);
    if (item) item.status = status as any;
  }

  async updatePayment(id: number, paidAmount: number, remainingAmount: number): Promise<void> {
    const item = this.items.find((p) => p.id === id);
    if (!item) return;
    item.paidAmount = paidAmount;
    item.remainingAmount = remainingAmount;
  }

  updatePaymentSync(id: number, paidAmount: number, remainingAmount: number): void {
    const item = this.items.find((p) => p.id === id);
    if (!item) return;
    item.paidAmount = paidAmount;
    item.remainingAmount = remainingAmount;
  }
}

class FakeSupplierRepository implements ISupplierRepository {
  private suppliers: Supplier[] = [];

  seed(items: Supplier[]): void {
    this.suppliers = items;
  }

  async findAll(): Promise<{ items: Supplier[]; total: number }> {
    return { items: this.suppliers, total: this.suppliers.length };
  }

  findByIdSync(id: number): Supplier | null {
    return this.suppliers.find((s) => s.id === id) || null;
  }

  async findById(id: number): Promise<Supplier | null> {
    return this.findByIdSync(id);
  }

  async create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    const created = {
      ...supplier,
      id: this.suppliers.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Supplier;
    this.suppliers.push(created);
    return created;
  }

  async update(id: number, supplier: Partial<Supplier>): Promise<Supplier> {
    const current = this.findByIdSync(id);
    if (!current) throw new Error('Supplier not found');
    const updated = { ...current, ...supplier, updatedAt: new Date().toISOString() };
    this.suppliers = this.suppliers.map((s) => (s.id === id ? updated : s));
    return updated;
  }

  async delete(id: number): Promise<void> {
    this.suppliers = this.suppliers.filter((s) => s.id !== id);
  }

  async updatePayable(id: number, amountChange: number): Promise<void> {
    const current = this.findByIdSync(id);
    if (!current) return;
    current.currentBalance = (current.currentBalance || 0) + amountChange;
  }
}

class FakeSupplierLedgerRepository implements ISupplierLedgerRepository {
  entries: SupplierLedgerEntry[] = [];
  private idCounter = 1;

  async create(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): Promise<SupplierLedgerEntry> {
    return this.createSync(entry);
  }

  createSync(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): SupplierLedgerEntry {
    const created = {
      ...entry,
      id: this.idCounter++,
      createdAt: new Date().toISOString(),
    } as SupplierLedgerEntry;
    this.entries.push(created);
    return created;
  }

  getLastBalanceSync(supplierId: number): number {
    const filtered = this.entries.filter((entry) => entry.supplierId === supplierId);
    if (filtered.length === 0) return 0;
    return filtered[filtered.length - 1].balanceAfter;
  }

  findByPaymentIdSync(paymentId: number): SupplierLedgerEntry | null {
    return this.entries.find((entry) => entry.paymentId === paymentId) || null;
  }

  async findAll(): Promise<{ items: SupplierLedgerEntry[]; total: number }> {
    return { items: this.entries, total: this.entries.length };
  }

  async getBalance(supplierId: number): Promise<number> {
    return this.getLastBalanceSync(supplierId);
  }
}

function createAccounts(): Account[] {
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
      code: '1200',
      name: 'Inventory',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 3,
      code: '2100',
      name: 'Accounts Payable',
      accountType: 'liability',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 4,
      code: '1300',
      name: 'VAT Input',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
  ];
}

describe('CreatePurchaseUseCase', () => {
  let purchaseRepo: FakePurchaseRepository;
  let supplierRepo: FakeSupplierRepository;
  let paymentRepo: FakePaymentRepository;
  let supplierLedgerRepo: FakeSupplierLedgerRepository;
  let accountingRepo: FakeAccountingRepository;
  let useCase: CreatePurchaseUseCase;

  beforeEach(() => {
    purchaseRepo = new FakePurchaseRepository();
    supplierRepo = new FakeSupplierRepository();
    supplierRepo.seed([
      {
        id: 1,
        name: 'Supplier 1',
        currentBalance: 0,
        openingBalance: 0,
        isActive: true,
      },
    ]);
    paymentRepo = new FakePaymentRepository();
    supplierLedgerRepo = new FakeSupplierLedgerRepository();
    accountingRepo = new FakeAccountingRepository();
    accountingRepo.seedAccounts(createAccounts());

    useCase = new CreatePurchaseUseCase(
      purchaseRepo,
      supplierRepo,
      paymentRepo,
      supplierLedgerRepo,
      accountingRepo
    );
  });

  it('creates purchase with remaining balance, AP ledger, and balanced journal', async () => {
    const result = await useCase.execute(
      {
        invoiceNumber: 'PUR-1001',
        supplierId: 1,
        paidAmount: 4_000,
        items: [
          {
            productId: 10,
            productName: 'Rice',
            quantity: 10,
            unitCost: 1_000,
            lineSubtotal: 10_000,
          },
        ],
      },
      7
    );

    expect(result.total).toBe(10_000);
    expect(result.remainingAmount).toBe(6_000);

    expect(paymentRepo.findByPurchaseId(result.id!)).toHaveLength(1);
    expect(paymentRepo.findByPurchaseId(result.id!)[0].amount).toBe(4_000);

    expect(supplierLedgerRepo.entries).toHaveLength(1);
    expect(supplierLedgerRepo.entries[0].amount).toBe(6_000);
    expect(supplierLedgerRepo.entries[0].transactionType).toBe('invoice');

    expect(accountingRepo.entries).toHaveLength(1);
    const lines = accountingRepo.entries[0].lines || [];
    const debit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(10_000);
  });

  it('is idempotent by idempotency key (no duplicate purchase/payment/ledger/journal)', async () => {
    const input = {
      invoiceNumber: 'PUR-1002',
      supplierId: 1,
      paidAmount: 1_000,
      idempotencyKey: 'purchase-idem-1002',
      items: [
        {
          productId: 11,
          productName: 'Sugar',
          quantity: 2,
          unitCost: 1_500,
          lineSubtotal: 3_000,
        },
      ],
    };

    const first = await useCase.execute(input, 1);
    const second = await useCase.execute(input, 1);

    expect(second.id).toBe(first.id);
    expect(purchaseRepo.items).toHaveLength(1);
    expect(paymentRepo.findByPurchaseId(first.id!)).toHaveLength(1);
    expect(supplierLedgerRepo.entries).toHaveLength(1);
    expect(accountingRepo.entries).toHaveLength(1);
  });

  it('splits inventory and VAT input when tax > 0', async () => {
    const result = await useCase.execute(
      {
        invoiceNumber: 'PUR-VAT-1',
        supplierId: 1,
        paidAmount: 11_500,
        tax: 1_500,
        items: [
          {
            productId: 10,
            productName: 'Rice',
            quantity: 10,
            unitCost: 1_000,
            lineSubtotal: 10_000,
          },
        ],
      },
      7
    );

    expect(result.total).toBe(11_500); // subtotal 10000 - discount 0 + tax 1500

    expect(accountingRepo.entries).toHaveLength(1);
    const lines = accountingRepo.entries[0].lines || [];

    // Inventory debit = total - tax = 10000
    const inventoryLine = lines.find((l) => l.accountId === 2); // code 1200
    expect(inventoryLine?.debit).toBe(10_000);

    // VAT Input debit = tax = 1500
    const vatLine = lines.find((l) => l.accountId === 4); // code 1300
    expect(vatLine?.debit).toBe(1_500);

    // Cash credit = paidAmount = 11500
    const cashLine = lines.find((l) => l.accountId === 1); // code 1001
    expect(cashLine?.credit).toBe(11_500);

    // Journal is balanced
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('creates journal entries as unposted', async () => {
    await useCase.execute(
      {
        invoiceNumber: 'PUR-POST-1',
        supplierId: 1,
        paidAmount: 10_000,
        items: [
          {
            productId: 10,
            productName: 'Rice',
            quantity: 10,
            unitCost: 1_000,
            lineSubtotal: 10_000,
          },
        ],
      },
      7
    );

    expect(accountingRepo.entries).toHaveLength(1);
    expect(accountingRepo.entries[0].isPosted).toBe(false);
  });
});
