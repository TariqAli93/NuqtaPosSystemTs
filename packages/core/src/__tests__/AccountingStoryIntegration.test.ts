import { beforeEach, describe, expect, it } from 'vitest';
import { CreateSaleUseCase } from '../use-cases/CreateSaleUseCase';
import { AddPaymentUseCase } from '../use-cases/AddPaymentUseCase';
import { CreatePurchaseUseCase } from '../use-cases/CreatePurchaseUseCase';
import { AddPurchasePaymentUseCase } from '../use-cases/AddPurchasePaymentUseCase';
import { PostPeriodUseCase } from '../use-cases/posting/PostPeriodUseCase';
import { GetModuleSettingsUseCase } from '../use-cases/GetModuleSettingsUseCase';
import type { IPurchaseRepository } from '../interfaces/IPurchaseRepository';
import type { ISupplierRepository } from '../interfaces/ISupplierRepository';
import type { ISupplierLedgerRepository } from '../interfaces/ISupplierLedgerRepository';
import type { IPostingRepository } from '../interfaces/IPostingRepository';
import type { Purchase } from '../entities/Purchase';
import type { Supplier } from '../entities/Supplier';
import type { SupplierLedgerEntry } from '../entities/Ledger';
import type { Account, JournalEntry } from '../entities/Accounting';
import type { PostingBatch } from '../entities/PostingBatch';
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

class InMemoryPurchaseRepository implements IPurchaseRepository {
  items: Purchase[] = [];
  private idCounter = 1;

  async create(purchase: Purchase): Promise<Purchase> {
    return this.createSync(purchase);
  }

  createSync(purchase: Purchase): Purchase {
    const created = {
      ...purchase,
      id: this.idCounter++,
      status: purchase.status || (purchase.remainingAmount <= 0 ? 'completed' : 'pending'),
      createdAt: purchase.createdAt || new Date().toISOString(),
      updatedAt: purchase.updatedAt || new Date().toISOString(),
    } as Purchase;
    this.items.push(created);
    return created;
  }

  findByIdempotencyKey(key: string): Purchase | null {
    return this.items.find((item) => item.idempotencyKey === key) || null;
  }

  async findAll(): Promise<{ items: Purchase[]; total: number }> {
    return { items: [...this.items], total: this.items.length };
  }

  async findById(id: number): Promise<Purchase | null> {
    return this.findByIdSync(id);
  }

  findByIdSync(id: number): Purchase | null {
    return this.items.find((item) => item.id === id) || null;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    this.updateStatusSync(id, status);
  }

  updateStatusSync(id: number, status: string): void {
    const item = this.items.find((p) => p.id === id);
    if (!item) return;
    item.status = status as Purchase['status'];
    item.updatedAt = new Date().toISOString();
  }

  async updatePayment(id: number, paidAmount: number, remainingAmount: number): Promise<void> {
    this.updatePaymentSync(id, paidAmount, remainingAmount);
  }

  updatePaymentSync(id: number, paidAmount: number, remainingAmount: number): void {
    const item = this.items.find((p) => p.id === id);
    if (!item) return;
    item.paidAmount = paidAmount;
    item.remainingAmount = remainingAmount;
    item.status = remainingAmount <= 0 ? 'completed' : 'pending';
    item.updatedAt = new Date().toISOString();
  }
}

class InMemorySupplierRepository implements ISupplierRepository {
  private suppliers: Supplier[] = [];

  seed(items: Supplier[]): void {
    this.suppliers = items;
  }

  async findAll(): Promise<{ items: Supplier[]; total: number }> {
    return { items: [...this.suppliers], total: this.suppliers.length };
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

class InMemorySupplierLedgerRepository implements ISupplierLedgerRepository {
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

  findByPaymentIdSync(paymentId: number): SupplierLedgerEntry | null {
    return this.entries.find((entry) => entry.paymentId === paymentId) || null;
  }

  getLastBalanceSync(supplierId: number): number {
    const filtered = this.entries.filter((entry) => entry.supplierId === supplierId);
    if (filtered.length === 0) return 0;
    return filtered[filtered.length - 1].balanceAfter;
  }

  async findAll(): Promise<{ items: SupplierLedgerEntry[]; total: number }> {
    return { items: this.entries, total: this.entries.length };
  }

  async getBalance(supplierId: number): Promise<number> {
    return this.getLastBalanceSync(supplierId);
  }
}

class InMemoryPostingRepository implements IPostingRepository {
  private batches: PostingBatch[] = [];
  private batchIdCounter = 1;

  constructor(private accountingRepo: FakeAccountingRepository) {}

  createBatch(batch: Omit<PostingBatch, 'id' | 'createdAt'>): PostingBatch {
    const created: PostingBatch = {
      ...batch,
      id: this.batchIdCounter++,
      createdAt: new Date().toISOString(),
      notes: batch.notes || null,
    };
    this.batches.push(created);
    return created;
  }

  getBatches(): { items: PostingBatch[]; total: number } {
    return { items: [...this.batches], total: this.batches.length };
  }

  getBatchById(id: number): PostingBatch | null {
    return this.batches.find((batch) => batch.id === id) || null;
  }

  getUnpostedEntries(startDate: string, endDate: string): JournalEntry[] {
    return this.accountingRepo.entries.filter(
      (entry) => !entry.isPosted && entry.entryDate >= startDate && entry.entryDate <= endDate
    );
  }

  getPostedEntryIdsByBatch(batchId: number): number[] {
    return this.accountingRepo.entries
      .filter((entry) => entry.isPosted && entry.postingBatchId === batchId && entry.id)
      .map((entry) => entry.id!) as number[];
  }

  markEntriesAsPosted(entryIds: number[], batchId: number): number {
    let updated = 0;
    for (const entry of this.accountingRepo.entries) {
      if (!entry.id || !entryIds.includes(entry.id)) continue;
      entry.isPosted = true;
      entry.postingBatchId = batchId;
      updated += 1;
    }
    return updated;
  }

  createReversalEntry(originalEntryId: number, userId: number): JournalEntry {
    const original = this.accountingRepo.entries.find((entry) => entry.id === originalEntryId);
    if (!original) throw new Error('Journal entry not found');
    if (!original.isPosted) throw new Error('Cannot reverse unposted entry');
    if (original.isReversed) throw new Error('Entry is already reversed');

    const nextId =
      this.accountingRepo.entries.reduce((max, entry) => {
        return Math.max(max, entry.id || 0);
      }, 0) + 1;

    const reversedLines = (original.lines || []).map((line) => ({
      ...line,
      debit: line.credit || 0,
      credit: line.debit || 0,
    }));

    const reversal: JournalEntry = {
      ...original,
      id: nextId,
      entryNumber: `REV-${original.entryNumber}`,
      entryDate: new Date().toISOString(),
      description: `Reversal of ${original.entryNumber}`,
      reversalOfId: original.id,
      isReversed: false,
      isPosted: false,
      postingBatchId: undefined,
      createdBy: userId,
      lines: reversedLines,
    };

    original.isReversed = true;
    this.accountingRepo.entries.push(reversal);
    return reversal;
  }

  voidUnpostedEntry(entryId: number): void {
    const entry = this.accountingRepo.entries.find((e) => e.id === entryId);
    if (!entry) throw new Error(`Journal entry ${entryId} not found`);
    if (entry.isPosted)
      throw new Error(`Journal entry ${entryId} is posted — use reversal instead`);
    if (entry.isReversed) throw new Error(`Journal entry ${entryId} is already voided/reversed`);
    entry.isReversed = true;
  }

  lockBatch(batchId: number): void {
    const batch = this.batches.find((b) => b.id === batchId);
    if (batch) (batch as any).isLocked = true;
  }

  unlockBatch(batchId: number): void {
    const batch = this.batches.find((b) => b.id === batchId);
    if (batch) (batch as any).isLocked = false;
  }

  isBatchLocked(batchId: number): boolean {
    const batch = this.batches.find((b) => b.id === batchId);
    return !!(batch as any)?.isLocked;
  }
}

function seedAccounts(): Account[] {
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
    {
      id: 3,
      code: '1200',
      name: 'Inventory',
      accountType: 'asset',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 4,
      code: '2100',
      name: 'Accounts Payable',
      accountType: 'liability',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 5,
      code: '4001',
      name: 'Sales Revenue',
      accountType: 'revenue',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
    {
      id: 6,
      code: '5001',
      name: 'COGS',
      accountType: 'expense',
      balance: 0,
      isSystem: false,
      isActive: true,
    },
  ];
}

describe('Accounting Story Integration', () => {
  let productRepo: FakeProductRepository;
  let saleRepo: FakeSaleRepository;
  let customerRepo: FakeCustomerRepository;
  let settingsRepo: FakeSettingsRepository;
  let paymentRepo: FakePaymentRepository;
  let inventoryRepo: FakeInventoryRepository;
  let accountingRepo: FakeAccountingRepository;
  let customerLedgerRepo: FakeCustomerLedgerRepository;
  let auditRepo: FakeAuditRepository;

  let purchaseRepo: InMemoryPurchaseRepository;
  let supplierRepo: InMemorySupplierRepository;
  let supplierLedgerRepo: InMemorySupplierLedgerRepository;
  let postingRepo: InMemoryPostingRepository;

  let createSaleUseCase: CreateSaleUseCase;
  let addSalePaymentUseCase: AddPaymentUseCase;
  let createPurchaseUseCase: CreatePurchaseUseCase;
  let addPurchasePaymentUseCase: AddPurchasePaymentUseCase;
  let postPeriodUseCase: PostPeriodUseCase;

  beforeEach(() => {
    productRepo = new FakeProductRepository();
    saleRepo = new FakeSaleRepository();
    customerRepo = new FakeCustomerRepository();
    settingsRepo = new FakeSettingsRepository();
    paymentRepo = new FakePaymentRepository();
    inventoryRepo = new FakeInventoryRepository();
    accountingRepo = new FakeAccountingRepository();
    customerLedgerRepo = new FakeCustomerLedgerRepository();
    auditRepo = new FakeAuditRepository();

    purchaseRepo = new InMemoryPurchaseRepository();
    supplierRepo = new InMemorySupplierRepository();
    supplierLedgerRepo = new InMemorySupplierLedgerRepository();
    postingRepo = new InMemoryPostingRepository(accountingRepo);

    accountingRepo.seedAccounts(seedAccounts());
    supplierRepo.seed([
      {
        id: 1,
        name: 'Supplier 1',
        currentBalance: 0,
        openingBalance: 0,
        isActive: true,
      },
    ]);

    settingsRepo.set('accounting.enabled', 'true');
    settingsRepo.set('modules.accounting.enabled', 'true');
    settingsRepo.set('ledgers.enabled', 'true');
    settingsRepo.set('modules.ledgers.enabled', 'true');
    settingsRepo.set('purchases.enabled', 'true');
    settingsRepo.set('modules.purchases.enabled', 'true');

    createSaleUseCase = new CreateSaleUseCase(
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

    addSalePaymentUseCase = new AddPaymentUseCase(
      saleRepo,
      paymentRepo,
      customerRepo,
      customerLedgerRepo,
      accountingRepo,
      settingsRepo
    );

    createPurchaseUseCase = new CreatePurchaseUseCase(
      purchaseRepo,
      supplierRepo,
      paymentRepo,
      supplierLedgerRepo,
      accountingRepo,
      settingsRepo
    );

    addPurchasePaymentUseCase = new AddPurchasePaymentUseCase(
      purchaseRepo,
      paymentRepo,
      supplierLedgerRepo,
      accountingRepo,
      settingsRepo
    );

    postPeriodUseCase = new PostPeriodUseCase(postingRepo, settingsRepo);
  });

  it('sale cash + posting batch', async () => {
    const product = productRepo.create({
      name: 'Tea',
      sku: 'P-TEA',
      costPrice: 500,
      sellingPrice: 1000,
      stock: 20,
      minStock: 1,
      unit: 'piece',
      currency: 'IQD',
      isExpire: false,
      isActive: true,
      status: 'available',
    });

    await createSaleUseCase.execute(
      {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 1000 }],
        paymentType: 'cash',
        paidAmount: 2000,
      },
      1
    );

    expect(accountingRepo.entries).toHaveLength(1);
    expect(accountingRepo.entries[0].isPosted).toBe(false);

    const batch = postPeriodUseCase.execute(
      {
        periodType: 'day',
        periodStart: '2000-01-01',
        periodEnd: '2999-12-31',
      },
      1
    );

    expect(batch.entriesCount).toBe(1);
    expect(accountingRepo.entries[0].isPosted).toBe(true);
    expect(accountingRepo.entries[0].postingBatchId).toBe(batch.id);
  });

  it('sale credit + payment later + posting batch', async () => {
    const customer = customerRepo.create({
      name: 'Customer A',
      isActive: true,
      totalDebt: 0,
      totalPurchases: 0,
    });

    const product = productRepo.create({
      name: 'Coffee',
      sku: 'P-COF',
      costPrice: 1000,
      sellingPrice: 2000,
      stock: 30,
      minStock: 1,
      unit: 'piece',
      currency: 'IQD',
      isExpire: false,
      isActive: true,
      status: 'available',
    });

    const sale = await createSaleUseCase.execute(
      {
        items: [{ productId: product.id!, quantity: 3, unitPrice: 2000 }],
        paymentType: 'credit',
        paidAmount: 0,
        customerId: customer.id,
      },
      1
    );

    expect(customerLedgerRepo.entries).toHaveLength(1);
    expect(customerLedgerRepo.entries[0].transactionType).toBe('invoice');

    await addSalePaymentUseCase.execute(
      {
        saleId: sale.id!,
        customerId: customer.id,
        amount: 2000,
        paymentMethod: 'cash',
      },
      1
    );

    expect(customerLedgerRepo.entries).toHaveLength(2);
    expect(customerLedgerRepo.entries[1].transactionType).toBe('payment');
    expect(accountingRepo.entries).toHaveLength(2);
    expect(accountingRepo.entries.every((entry) => entry.isPosted === false)).toBe(true);

    const batch = postPeriodUseCase.execute(
      {
        periodType: 'day',
        periodStart: '2000-01-01',
        periodEnd: '2999-12-31',
      },
      1
    );

    expect(batch.entriesCount).toBe(2);
    expect(accountingRepo.entries.every((entry) => entry.isPosted === true)).toBe(true);
  });

  it('purchase unpaid + payment later + posting batch', async () => {
    const purchase = await createPurchaseUseCase.execute(
      {
        invoiceNumber: 'PUR-1001',
        supplierId: 1,
        paidAmount: 0,
        items: [
          {
            productId: 1,
            productName: 'Rice',
            quantity: 5,
            unitCost: 2000,
            lineSubtotal: 10000,
          },
        ],
      },
      1
    );

    expect(purchase.remainingAmount).toBe(10000);
    expect(supplierLedgerRepo.entries).toHaveLength(1);
    expect(supplierLedgerRepo.entries[0].transactionType).toBe('invoice');

    const updatedPurchase = await addPurchasePaymentUseCase.execute(
      {
        purchaseId: purchase.id!,
        supplierId: 1,
        amount: 4000,
        paymentMethod: 'cash',
      },
      1
    );

    expect(updatedPurchase.paidAmount).toBe(4000);
    expect(updatedPurchase.remainingAmount).toBe(6000);
    expect(supplierLedgerRepo.entries).toHaveLength(2);
    expect(supplierLedgerRepo.entries[1].transactionType).toBe('payment');
    expect(accountingRepo.entries).toHaveLength(2);
    expect(accountingRepo.entries.every((entry) => entry.isPosted === false)).toBe(true);

    const batch = postPeriodUseCase.execute(
      {
        periodType: 'day',
        periodStart: '2000-01-01',
        periodEnd: '2999-12-31',
      },
      1
    );

    expect(batch.entriesCount).toBe(2);
    expect(accountingRepo.entries.every((entry) => entry.isPosted === true)).toBe(true);
  });

  it('accounting disabled: module settings reflect disabled state and journals are not written', async () => {
    settingsRepo.set('accounting.enabled', 'false');
    settingsRepo.set('modules.accounting.enabled', 'false');

    const moduleSettings = new GetModuleSettingsUseCase(settingsRepo).execute();
    expect(moduleSettings.modules.accountingEnabled).toBe(false);

    const customer = customerRepo.create({
      name: 'Customer B',
      isActive: true,
      totalDebt: 0,
      totalPurchases: 0,
    });

    const product = productRepo.create({
      name: 'Milk',
      sku: 'P-MILK',
      costPrice: 500,
      sellingPrice: 1500,
      stock: 50,
      minStock: 2,
      unit: 'piece',
      currency: 'IQD',
      isExpire: false,
      isActive: true,
      status: 'available',
    });

    const sale = await createSaleUseCase.execute(
      {
        items: [{ productId: product.id!, quantity: 2, unitPrice: 1500 }],
        paymentType: 'credit',
        paidAmount: 0,
        customerId: customer.id,
      },
      1
    );

    await addSalePaymentUseCase.execute(
      {
        saleId: sale.id!,
        customerId: customer.id,
        amount: 1000,
        paymentMethod: 'cash',
      },
      1
    );

    const purchase = await createPurchaseUseCase.execute(
      {
        invoiceNumber: 'PUR-2001',
        supplierId: 1,
        paidAmount: 0,
        items: [
          {
            productId: 1,
            productName: 'Flour',
            quantity: 4,
            unitCost: 1000,
            lineSubtotal: 4000,
          },
        ],
      },
      1
    );

    await addPurchasePaymentUseCase.execute(
      {
        purchaseId: purchase.id!,
        supplierId: 1,
        amount: 1000,
        paymentMethod: 'cash',
      },
      1
    );

    expect(accountingRepo.entries).toHaveLength(0);
  });
});
