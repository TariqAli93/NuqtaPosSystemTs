import { Customer } from '../entities/Customer.js';

export interface ICustomerRepository {
  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): { items: Customer[]; total: number };
  findById(id: number): Customer | null;
  create(customer: Customer): Customer;
  update(id: number, customer: Partial<Customer>): Customer;
  delete(id: number): void;
  updateDebt(id: number, amountChange: number): void;
}
