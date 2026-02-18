import { CustomerLedgerEntry } from '../entities/Ledger.js';

export interface ICustomerLedgerRepository {
  create(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): Promise<CustomerLedgerEntry>;
  createSync(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): CustomerLedgerEntry;
  getLastBalanceSync(customerId: number): number;
  findByPaymentIdSync(paymentId: number): CustomerLedgerEntry | null;
  findAll(params: {
    customerId: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CustomerLedgerEntry[]; total: number }>;
  getBalance(customerId: number): Promise<number>;
}
