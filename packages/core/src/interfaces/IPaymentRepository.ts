import { Payment } from '../entities/Payment.js';

export interface IPaymentRepository {
  create(payment: Payment): Payment;
  createSync(payment: Payment): Payment;
  findByIdempotencyKey(key: string): Payment | null;
  findBySaleId(saleId: number): Payment[];
  findByPurchaseId(purchaseId: number): Payment[];
  findByCustomerId(customerId: number): Payment[];
  findBySupplierId(supplierId: number): Payment[];
  delete(id: number): void;
}
