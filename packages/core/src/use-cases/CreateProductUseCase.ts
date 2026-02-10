import { IProductRepository } from '../interfaces/IProductRepository.js';
import { Product } from '../entities/Product.js';
import { ValidationError } from '../errors/DomainErrors.js';

export class CreateProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(productData: Product): Promise<Product> {
    if (!productData.name || productData.name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }

    if (productData.costPrice < 0) {
      throw new ValidationError('Cost price must be non-negative');
    }

    if (productData.sellingPrice < 0) {
      throw new ValidationError('Selling price must be non-negative');
    }

    if (productData.stock < 0) {
      throw new ValidationError('Stock must be non-negative');
    }

    return await this.productRepo.create(productData);
  }
}
