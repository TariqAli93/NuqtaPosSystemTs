import { IProductRepository } from '../interfaces/IProductRepository.js';
import { Product } from '../entities/Product.js';

export class GetProductsUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(
    params: { search?: string; page?: number; limit?: number; categoryId?: number } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return this.productRepo.findAll({
      search: params.search,
      categoryId: params.categoryId,
      limit,
      offset,
    });
  }
}
