import { IProductRepository } from '../interfaces/IProductRepository.js';
import { Product, ProductInput, ProductSchema } from '../entities/Product.js';
import { ValidationError } from '../errors/DomainErrors.js';

export class CreateProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(productData: ProductInput): Promise<Product> {
    let product: Product;
    try {
      product = ProductSchema.parse(productData);
    } catch (error: any) {
      throw new ValidationError(error?.issues?.[0]?.message || 'Invalid product data');
    }

    if (!product.name || product.name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }

    if (product.costPrice < 0) {
      throw new ValidationError('Cost price must be non-negative');
    }

    if (product.sellingPrice < 0) {
      throw new ValidationError('Selling price must be non-negative');
    }

    if (product.stock < 0) {
      throw new ValidationError('Stock must be non-negative');
    }

    return await this.productRepo.create(product);
  }
}
