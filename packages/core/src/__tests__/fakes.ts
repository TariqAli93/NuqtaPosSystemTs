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
import { Settings } from '../entities/Settings';
import { AuditEvent } from '../entities/AuditEvent';

export class FakeProductRepository implements IProductRepository {
  private products: Product[] = [];
  private idCounter = 1;

  async create(product: Product): Promise<Product> {
    const newProduct = { ...product, id: this.idCounter++ };
    this.products.push(newProduct);
    return newProduct;
  }

  async findById(id: number): Promise<Product | null> {
    return this.products.find((p) => p.id === id) || null;
  }

  async findAll(): Promise<{ items: Product[]; total: number }> {
    return { items: this.products, total: this.products.length };
  }

  async update(id: number, data: Partial<Product>): Promise<Product> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');
    this.products[index] = { ...this.products[index], ...data };
    return this.products[index];
  }

  async delete(id: number): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }

  async updateStock(id: number, quantityChange: number): Promise<void> {
    const product = await this.findById(id);
    if (product) {
      product.stock += quantityChange;
    }
  }

  async countLowStock(threshold: number): Promise<number> {
    return this.products.filter((p) => p.stock <= threshold).length;
  }
}

export class FakeSaleRepository implements ISaleRepository {
  private sales: Sale[] = [];
  private idCounter = 1;

  async create(sale: Sale): Promise<Sale> {
    const newSale = { ...sale, id: this.idCounter++ };
    this.sales.push(newSale);
    return newSale;
  }

  async findById(id: number): Promise<Sale | null> {
    return this.sales.find((s) => s.id === id) || null;
  }

  async findAll(): Promise<{ items: Sale[]; total: number }> {
    return { items: this.sales, total: this.sales.length };
  }

  async updateStatus(id: number, status: 'completed' | 'cancelled'): Promise<void> {
    const sale = this.sales.find((s) => s.id === id);
    if (sale) sale.status = status;
  }

  async update(id: number, data: Partial<Sale>): Promise<void> {
    const index = this.sales.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.sales[index] = { ...this.sales[index], ...data };
    }
  }

  async getDailySummary(): Promise<any> {
    return { revenue: 0, count: 0, cash: 0, card: 0, transfer: 0 };
  }

  async getTopSelling(): Promise<any[]> {
    return [];
  }
}

export class FakeCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [];
  private idCounter = 1;

  async create(customer: Customer): Promise<Customer> {
    const newCustomer = { ...customer, id: this.idCounter++ };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async findById(id: number): Promise<Customer | null> {
    return this.customers.find((c) => c.id === id) || null;
  }

  async findAll(): Promise<{ items: Customer[]; total: number }> {
    return { items: this.customers, total: this.customers.length };
  }

  async update(id: number, data: Partial<Customer>): Promise<Customer> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    this.customers[index] = { ...this.customers[index], ...data };
    return this.customers[index];
  }

  async delete(id: number): Promise<void> {
    this.customers = this.customers.filter((c) => c.id !== id);
  }

  async updateDebt(id: number, amount: number): Promise<void> {
    const customer = await this.findById(id);
    if (customer) {
      customer.totalDebt = (customer.totalDebt || 0) + amount;
      customer.totalPurchases = (customer.totalPurchases || 0) + 1;
    }
  }

  async search(query: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.name.includes(query));
  }
}

export class FakeSettingsRepository implements ISettingsRepository {
  private settings: Settings[] = [];

  async get(key: string): Promise<any> {
    // Default settings for tests
    if (key === 'currency_base') return 'USD';
    if (key === 'exchange_rate_iqd') return 1450;
    const setting = this.settings.find((s) => s.key === key);
    return setting ? setting.value : null;
  }

  async set(key: string, value: any): Promise<void> {
    const index = this.settings.findIndex((s) => s.key === key);
    if (index !== -1) {
      this.settings[index].value = value;
    } else {
      this.settings.push({ key, value, updatedAt: new Date().toISOString() } as any);
    }
  }

  async getCurrencySettings(): Promise<{
    defaultCurrency: string;
    usdRate: number;
    iqdRate: number;
  }> {
    return { defaultCurrency: 'USD', usdRate: 1, iqdRate: 1450 };
  }

  async getAll(): Promise<Settings[]> {
    return this.settings;
  }
}

export class FakePaymentRepository implements IPaymentRepository {
  private payments: Payment[] = [];
  private idCounter = 1;

  async create(payment: Payment): Promise<Payment> {
    const newPayment = { ...payment, id: this.idCounter++ };
    this.payments.push(newPayment);
    return newPayment;
  }

  async findBySaleId(saleId: number): Promise<Payment[]> {
    return this.payments.filter((p) => p.saleId === saleId);
  }

  async delete(id: number): Promise<void> {
    this.payments = this.payments.filter((p) => p.id !== id);
  }
}

export class FakeAuditRepository implements IAuditRepository {
  async log(event: AuditEvent): Promise<void> {
    // No-op
  }

  async create(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    return { ...event, id: 1, timestamp: new Date().toISOString() } as AuditEvent;
  }

  async find(): Promise<AuditEvent[]> {
    return [];
  }

  async getByFilters(filters: any): Promise<AuditEvent[]> {
    return [];
  }

  async getById(id: number): Promise<AuditEvent | null> {
    return null;
  }

  async count(filters: any): Promise<number> {
    return 0;
  }

  async cleanOldLogs(retentionDays: number): Promise<number> {
    return 0;
  }

  async getStats(fromDate?: Date, toDate?: Date): Promise<any> {
    return {};
  }

  async getAuditTrail(entityType: string, entityId: number, limit?: number): Promise<AuditEvent[]> {
    return [];
  }

  async deleteOlderThan(olderThanDays: number): Promise<number> {
    return 0;
  }
}
