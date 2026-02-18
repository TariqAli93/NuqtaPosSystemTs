import { IAccountingRepository } from '../../interfaces/IAccountingRepository.js';

export class GetBalanceSheetUseCase {
  constructor(private repo: IAccountingRepository) {}

  async execute(params?: { asOfDate?: string }) {
    return this.repo.getBalanceSheet(params);
  }
}
