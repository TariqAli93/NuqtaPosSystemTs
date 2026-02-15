import { IProductRepository } from '../interfaces/IProductRepository';
import { ISaleRepository } from '../interfaces/ISaleRepository';
import { ICustomerRepository } from '../interfaces/ICustomerRepository';
import { ISettingsRepository } from '../interfaces/ISettingsRepository';
import { IPaymentRepository } from '../interfaces/IPaymentRepository';
import { IAuditRepository } from '../interfaces/IAuditRepository';
import { Product } from '../entities/Product';
import { Sale } from '../entities/Sale';
import { Customer } from '../entities/Customer';
import { Payment } from '../entities/Payment';
import { Settings, CompanySettings } from '../entities/Settings';
import { AuditEvent } from '../entities/AuditEvent';

export class FakeProductRepository implements IProductRepository {
  private products: Product[] = [];
  private idCounter = 1;

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

  countLowStock(threshold: number): number {
    return this.products.filter((p) => p.stock <= threshold).length;
  }
}

export class FakeSaleRepository implements ISaleRepository {
  private sales: Sale[] = [];
  private idCounter = 1;

  create(sale: Sale): Sale {
    const newSale = { ...sale, id: this.idCounter++ };
    this.sales.push(newSale);
    return newSale;
  }

  findById(id: number): Sale | null {
    return this.sales.find((s) => s.id === id) || null;
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
    const newPayment = { ...payment, id: this.idCounter++ };
    this.payments.push(newPayment);
    return newPayment;
  }

  findBySaleId(saleId: number): Payment[] {
    return this.payments.filter((p) => p.saleId === saleId);
  }

  delete(id: number): void {
    this.payments = this.payments.filter((p) => p.id !== id);
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
