import { IProductRepository } from '../interfaces/IProductRepository';
import { ISaleRepository } from '../interfaces/ISaleRepository';
import { ICustomerRepository } from '../interfaces/ICustomerRepository';
import { ISettingsRepository } from '../interfaces/ISettingsRepository';
import { IPaymentRepository } from '../interfaces/IPaymentRepository';
import { IInventoryRepository } from '../interfaces/IInventoryRepository';
import { IAccountingRepository } from '../interfaces/IAccountingRepository';
import { ICustomerLedgerRepository } from '../interfaces/ICustomerLedgerRepository';
import { IAuditRepository } from '../interfaces/IAuditRepository';
import { Product } from '../entities/Product';
import { ProductBatch } from '../entities/ProductBatch';
import { Sale, SaleItemDepletion } from '../entities/Sale';
import { Customer } from '../entities/Customer';
import { Payment } from '../entities/Payment';
import { Settings, CompanySettings } from '../entities/Settings';
import { AuditEvent } from '../entities/AuditEvent';
import { InventoryMovement } from '../entities/InventoryMovement';
import { Account, JournalEntry } from '../entities/Accounting';
import { CustomerLedgerEntry } from '../entities/Ledger';

import { ProductUnit } from '../entities/ProductUnit';

export class FakeProductRepository implements IProductRepository {
  private products: Product[] = [];
  private idCounter = 1;
  batchStockUpdates: Array<{ batchId: number; quantityChange: number }> = [];
  private units: ProductUnit[] = [];
  private unitIdCounter = 1;
  private batches: ProductBatch[] = [];
  private batchIdCounter = 1;

  create(product: Product): Product {
    const newProduct = { ...product, id: this.idCounter++ };
    this.products.push(newProduct);
    return newProduct;
  }

  findById(id: number): Product | null {
    return this.products.find((p) => p.id === id) || null;
  }

  findAll(): { items: Product[]; total: number } {
    return { items: this.products, total: this.products.length };
  }

  update(id: number, data: Partial<Product>): Product {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    this.products[index] = { ...this.products[index], ...data };
    return this.products[index];
  }

  delete(id: number): void {
    this.products = this.products.filter((p) => p.id !== id);
  }

  updateStock(id: number, quantityChange: number): void {
    const product = this.findById(id);
    if (product) {
      product.stock += quantityChange;
    }
  }

  setStock(id: number, absoluteStock: number): void {
    const product = this.findById(id);
    if (product) {
      product.stock = absoluteStock;
    }
  }

  updateBatchStock(_batchId: number, _quantityChange: number): void {
    this.batchStockUpdates.push({ batchId: _batchId, quantityChange: _quantityChange });
    const batch = this.batches.find((b) => b.id === _batchId);
    if (batch) {
      batch.quantityOnHand = Math.max(0, batch.quantityOnHand + _quantityChange);
      batch.status = batch.quantityOnHand > 0 ? 'active' : 'depleted';
    }
  }

  countLowStock(threshold: number): number {
    return this.products.filter((p) => p.stock <= threshold).length;
  }

  findBatchesByProductId(productId: number): ProductBatch[] {
    return this.batches.filter((b) => b.productId === productId);
  }

  createBatch(batch: Omit<ProductBatch, 'id' | 'createdAt'>): ProductBatch {
    const newBatch: ProductBatch = {
      ...batch,
      id: this.batchIdCounter++,
      createdAt: new Date().toISOString(),
    };
    this.batches.push(newBatch);
    return newBatch;
  }

  findBatchById(batchId: number): ProductBatch | null {
    return this.batches.find((b) => b.id === batchId) || null;
  }

  findUnitsByProductId(productId: number): ProductUnit[] {
    return this.units.filter((u) => u.productId === productId);
  }

  createUnit(unit: Omit<ProductUnit, 'id' | 'createdAt'>): ProductUnit {
    const newUnit = {
      ...unit,
      id: this.unitIdCounter++,
      createdAt: new Date().toISOString(),
    } as ProductUnit;
    this.units.push(newUnit);
    return newUnit;
  }

  updateUnit(id: number, data: Partial<ProductUnit>): ProductUnit {
    const index = this.units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Unit not found');
    this.units[index] = { ...this.units[index], ...data };
    return this.units[index];
  }

  deleteUnit(id: number): void {
    this.units = this.units.filter((u) => u.id !== id);
  }

  setDefaultUnit(productId: number, unitId: number): void {
    this.units.forEach((u) => {
      if (u.productId === productId) {
        u.isDefault = u.id === unitId;
      }
    });
  }
}

export class FakeSaleRepository implements ISaleRepository {
  private sales: Sale[] = [];
  private saleItemDepletions: SaleItemDepletion[] = [];
  private idCounter = 1;
  private saleItemIdCounter = 1;
  private depletionIdCounter = 1;

  create(sale: Sale): Sale {
    const saleId = this.idCounter++;
    const items =
      sale.items?.map((item) => ({
        ...item,
        id: item.id ?? this.saleItemIdCounter++,
        saleId,
      })) || [];
    const newSale = { ...sale, id: saleId, items };
    this.sales.push(newSale);
    return newSale;
  }

  findById(id: number): Sale | null {
    return this.sales.find((s) => s.id === id) || null;
  }

  findByIdempotencyKey(key: string): Sale | null {
    return this.sales.find((s) => s.idempotencyKey === key) || null;
  }

  findAll(): { items: Sale[]; total: number } {
    return { items: this.sales, total: this.sales.length };
  }

  updateStatus(id: number, status: 'completed' | 'cancelled'): void {
    const sale = this.sales.find((s) => s.id === id);
    if (sale) sale.status = status;
  }

  update(id: number, data: Partial<Sale>): void {
    const index = this.sales.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.sales[index] = { ...this.sales[index], ...data };
    }
  }

  createItemDepletions(
    depletions: Omit<SaleItemDepletion, 'id' | 'createdAt' | 'batchNumber' | 'expiryDate'>[]
  ): void {
    for (const depletion of depletions) {
      this.saleItemDepletions.push({
        ...depletion,
        id: this.depletionIdCounter++,
        createdAt: new Date().toISOString(),
      });
    }
  }

  getItemDepletionsBySaleId(saleId: number): SaleItemDepletion[] {
    return this.saleItemDepletions.filter((depletion) => depletion.saleId === saleId);
  }

  getDailySummary(_date: Date): {
    revenue: number;
    count: number;
    cash: number;
    card: number;
    transfer: number;
  } {
    return { revenue: 0, count: 0, cash: 0, card: 0, transfer: 0 };
  }

  getTopSelling(_limit: number): {
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }[] {
    return [];
  }

  generateReceipt(_saleId: number): string {
    return '<html><body>Fake receipt</body></html>';
  }
}

export class FakeCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [];
  private idCounter = 1;

  create(customer: Customer): Customer {
    const newCustomer = { ...customer, id: this.idCounter++ };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  findById(id: number): Customer | null {
    return this.customers.find((c) => c.id === id) || null;
  }

  findAll(): { items: Customer[]; total: number } {
    return { items: this.customers, total: this.customers.length };
  }

  update(id: number, data: Partial<Customer>): Customer {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    this.customers[index] = { ...this.customers[index], ...data };
    return this.customers[index];
  }

  delete(id: number): void {
    this.customers = this.customers.filter((c) => c.id !== id);
  }

  updateDebt(id: number, amount: number): void {
    const customer = this.findById(id);
    if (customer) {
      customer.totalDebt = (customer.totalDebt || 0) + amount;
      customer.totalPurchases = (customer.totalPurchases || 0) + 1;
    }
  }

  search(query: string): Customer[] {
    return this.customers.filter((c) => c.name.includes(query));
  }
}

export class FakeSettingsRepository implements ISettingsRepository {
  private settings: Settings[] = [];

  get(key: string): string | null {
    if (key === 'currency_base') return 'USD';
    if (key === 'exchange_rate_iqd') return '1450';
    const setting = this.settings.find((s) => s.key === key);
    return setting ? String(setting.value) : null;
  }

  set(key: string, value: string): void {
    const index = this.settings.findIndex((s) => s.key === key);
    if (index !== -1) {
      this.settings[index].value = value;
    } else {
      this.settings.push({ key, value, updatedAt: new Date().toISOString() } as any);
    }
  }

  getCurrencySettings(): {
    defaultCurrency: string;
    usdRate: number;
    iqdRate: number;
  } {
    return { defaultCurrency: 'USD', usdRate: 1, iqdRate: 1450 };
  }

  getCompanySettings(): CompanySettings | null {
    const raw = this.get('company_settings');
    if (!raw) return null;

    try {
      return JSON.parse(raw) as CompanySettings;
    } catch {
      return null;
    }
  }

  setCompanySettings(settings: CompanySettings): void {
    this.set('company_settings', JSON.stringify(settings));
  }

  getAll(): Settings[] {
    return this.settings;
  }
}

export class FakePaymentRepository implements IPaymentRepository {
  private payments: Payment[] = [];
  private idCounter = 1;

  create(payment: Payment): Payment {
    return this.createSync(payment);
  }

  createSync(payment: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const newPayment = {
      ...payment,
      id: this.idCounter++,
      createdAt: payment.paymentDate || new Date().toISOString(),
    } as Payment;
    this.payments.push(newPayment);
    return newPayment;
  }

  findByIdempotencyKey(key: string): Payment | null {
    return this.payments.find((p) => p.idempotencyKey === key) || null;
  }

  findBySaleId(saleId: number): Payment[] {
    return this.payments.filter((p) => p.saleId === saleId);
  }

  findByPurchaseId(purchaseId: number): Payment[] {
    return this.payments.filter((p) => p.purchaseId === purchaseId);
  }

  findByCustomerId(customerId: number): Payment[] {
    return this.payments.filter((p) => p.customerId === customerId);
  }

  findBySupplierId(supplierId: number): Payment[] {
    return this.payments.filter((p) => p.supplierId === supplierId);
  }

  delete(id: number): void {
    this.payments = this.payments.filter((p) => p.id !== id);
  }
}

export class FakeInventoryRepository implements IInventoryRepository {
  movements: InventoryMovement[] = [];
  private idCounter = 1;

  async createMovement(
    movement: Omit<InventoryMovement, 'id' | 'createdAt'>
  ): Promise<InventoryMovement> {
    return this.createMovementSync(movement);
  }

  createMovementSync(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): InventoryMovement {
    const newMovement = {
      ...movement,
      id: this.idCounter++,
      createdAt: new Date().toISOString(),
    } as InventoryMovement;
    this.movements.push(newMovement);
    return newMovement;
  }

  async getMovements(): Promise<{ items: InventoryMovement[]; total: number }> {
    return { items: this.movements, total: this.movements.length };
  }

  async getDashboardStats(): Promise<{
    totalValuation: number;
    lowStockCount: number;
    expiryAlertCount: number;
    topMovingProducts: any[];
  }> {
    return { totalValuation: 0, lowStockCount: 0, expiryAlertCount: 0, topMovingProducts: [] };
  }

  async getExpiryAlerts(): Promise<any[]> {
    return [];
  }
}

export class FakeAccountingRepository implements IAccountingRepository {
  entries: JournalEntry[] = [];
  private accounts: Account[] = [];
  private idCounter = 1;

  /** Seed accounts for test scenarios */
  seedAccounts(accts: Account[]): void {
    this.accounts = accts;
  }

  createJournalEntry(entry: JournalEntry): JournalEntry {
    // Enforce posting policy: operational entries must be unposted
    if (entry.isPosted === true) {
      throw new Error(
        'Cannot create a posted journal entry directly. Entries must be created as unposted and posted via PostPeriodUseCase.'
      );
    }
    const created = { ...entry, id: this.idCounter++, isPosted: false };
    this.entries.push(created);
    return created;
  }

  createJournalEntrySync(entry: JournalEntry): JournalEntry {
    return this.createJournalEntry(entry);
  }

  createAccountSync(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const existing = this.findAccountByCode(account.code);
    if (existing) return existing;

    const created: Account = {
      ...account,
      id: this.accounts.length + 1,
      createdAt: new Date().toISOString(),
    };
    this.accounts.push(created);
    return created;
  }

  findAccountByCode(code: string): Account | null {
    return this.accounts.find((a) => a.code === code) || null;
  }

  async getAccounts(): Promise<Account[]> {
    return this.accounts;
  }

  async getJournalEntries(): Promise<{ items: JournalEntry[]; total: number }> {
    return { items: this.entries, total: this.entries.length };
  }

  async getEntryById(id: number): Promise<JournalEntry | null> {
    return this.entries.find((e) => e.id === id) || null;
  }

  async getTrialBalance(): Promise<any[]> {
    return [];
  }

  async getProfitLoss(): Promise<any> {
    return { revenue: [], expenses: [], totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
  }

  async getBalanceSheet(): Promise<any> {
    return {
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      equityAccounts: 0,
      revenueNet: 0,
      expenseNet: 0,
      currentEarnings: 0,
      totalEquity: 0,
      difference: 0,
    };
  }
}

export class FakeCustomerLedgerRepository implements ICustomerLedgerRepository {
  entries: CustomerLedgerEntry[] = [];
  private idCounter = 1;

  async create(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): Promise<CustomerLedgerEntry> {
    return this.createSync(entry);
  }

  createSync(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): CustomerLedgerEntry {
    const newEntry = {
      ...entry,
      id: this.idCounter++,
      createdAt: new Date().toISOString(),
    } as CustomerLedgerEntry;
    this.entries.push(newEntry);
    return newEntry;
  }

  findByPaymentIdSync(paymentId: number): CustomerLedgerEntry | null {
    return this.entries.find((entry) => entry.paymentId === paymentId) || null;
  }

  getLastBalanceSync(customerId: number): number {
    const customerEntries = this.entries.filter((e) => e.customerId === customerId);
    if (customerEntries.length === 0) return 0;
    return customerEntries[customerEntries.length - 1].balanceAfter;
  }

  async findAll(_params: {
    customerId: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CustomerLedgerEntry[]; total: number }> {
    return { items: this.entries, total: this.entries.length };
  }

  async getBalance(customerId: number): Promise<number> {
    const customerEntries = this.entries.filter((e) => e.customerId === customerId);
    if (customerEntries.length === 0) return 0;
    return customerEntries[customerEntries.length - 1].balanceAfter;
  }
}

export class FakeAuditRepository implements IAuditRepository {
  create(event: AuditEvent): AuditEvent {
    return event;
  }

  getByFilters(_filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): AuditEvent[] {
    return [];
  }

  getById(_id: number): AuditEvent | null {
    return null;
  }

  count(_filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): number {
    return 0;
  }

  getAuditTrail(_entityType: string, _entityId: number, _limit?: number): AuditEvent[] {
    return [];
  }

  deleteOlderThan(_olderThanDays: number): number {
    return 0;
  }

  log(event: AuditEvent): void {
    void event;
  }

  find(): AuditEvent[] {
    return [];
  }

  cleanOldLogs(): number {
    return 0;
  }

  getStats(): Record<string, unknown> {
    return {};
  }
}
