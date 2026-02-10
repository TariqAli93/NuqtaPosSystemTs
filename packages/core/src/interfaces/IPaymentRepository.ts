import { Payment } from '../entities/Payment.js';

export interface IPaymentRepository {
  create(payment: Payment): Promise<Payment>;
  findBySaleId(saleId: number): Promise<Payment[]>;
  delete(id: number): Promise<void>;
}
