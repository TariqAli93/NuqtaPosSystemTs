import { IProductRepository } from '../interfaces/IProductRepository.js';

export class DeleteProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: number): Promise<void> {
    return await this.productRepo.delete(id);
  }
}
