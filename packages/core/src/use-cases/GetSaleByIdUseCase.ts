import { ISaleRepository } from '../interfaces/ISaleRepository.js';
import { Sale } from '../entities/Sale.js';

export class GetSaleByIdUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(id: number): Promise<Sale | null> {
    return this.saleRepo.findById(id).then((sale) => {
      if (sale) {
        return sale;
      }
      return null;
    });
  }
}
