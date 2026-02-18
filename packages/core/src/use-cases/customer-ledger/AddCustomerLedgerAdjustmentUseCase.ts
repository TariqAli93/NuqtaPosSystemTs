import { ICustomerLedgerRepository } from '../../interfaces/ICustomerLedgerRepository.js';
import { ICustomerRepository } from '../../interfaces/ICustomerRepository.js';
import { NotFoundError } from '../../errors/DomainErrors.js';
import { CustomerLedgerEntry } from '../../entities/Ledger.js';

export interface LedgerAdjustmentInput {
  customerId: number;
  amount: number; // Positive = Increase Debt, Negative = Decrease Debt
  notes?: string;
}

export class AddCustomerLedgerAdjustmentUseCase {
  constructor(
    private ledgerRepo: ICustomerLedgerRepository,
    private customerRepo: ICustomerRepository
  ) {}

  executeCommitPhase(data: LedgerAdjustmentInput, userId = 1): CustomerLedgerEntry {
    const customer = this.customerRepo.findById(data.customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const currentDebt = this.ledgerRepo.getLastBalanceSync(data.customerId);
    const balanceAfter = currentDebt + data.amount;

    const entry = this.ledgerRepo.createSync({
      customerId: data.customerId,
      transactionType: 'adjustment',
      amount: data.amount,
      balanceAfter: balanceAfter,
      notes: data.notes,
      createdBy: userId,
    });

    return entry;
  }

  async execute(data: LedgerAdjustmentInput, userId = 1): Promise<CustomerLedgerEntry> {
    return this.executeCommitPhase(data, userId);
  }
}
