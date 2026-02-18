import { SupplierLedgerEntry } from '../entities/Ledger.js';

export interface ISupplierLedgerRepository {
  create(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): Promise<SupplierLedgerEntry>;
  createSync(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): SupplierLedgerEntry;
  getLastBalanceSync(supplierId: number): number;
  findByPaymentIdSync(paymentId: number): SupplierLedgerEntry | null;
  findAll(params: {
    supplierId: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SupplierLedgerEntry[]; total: number }>;
  getBalance(supplierId: number): Promise<number>;
}
