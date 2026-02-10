import { IProductRepository } from '../interfaces/IProductRepository.js';
import { Product } from '../entities/Product.js';
import { ValidationError } from '../errors/DomainErrors.js';

export class UpdateProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: number, productData: Partial<Product>): Promise<Product> {
    if (productData.name !== undefined && productData.name.trim().length === 0) {
      throw new ValidationError('Product name cannot be empty');
    }

    if (productData.costPrice !== undefined && productData.costPrice < 0) {
      throw new ValidationError('Cost price must be non-negative');
    }

    if (productData.sellingPrice !== undefined && productData.sellingPrice < 0) {
      throw new ValidationError('Selling price must be non-negative');
    }

    if (productData.stock !== undefined && productData.stock < 0) {
      throw new ValidationError('Stock must be non-negative');
    }

    return await this.productRepo.update(id, productData);
  }
}
