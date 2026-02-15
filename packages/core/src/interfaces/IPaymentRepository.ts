import { Payment } from '../entities/Payment.js';

export interface IPaymentRepository {
  create(payment: Payment): Payment;
  findBySaleId(saleId: number): Payment[];
  delete(id: number): void;
}
