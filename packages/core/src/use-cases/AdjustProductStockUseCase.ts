import { IProductRepository } from '../interfaces/IProductRepository.js';
import { NotFoundError, ValidationError, InsufficientStockError } from '../errors/DomainErrors.js';

export class AdjustProductStockUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(productId: number, quantityChange: number): Promise<void> {
    if (!Number.isInteger(quantityChange)) {
      throw new ValidationError('Quantity change must be an integer');
    }

    if (quantityChange === 0) {
      return; // No change needed
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const newStock = (product.stock || 0) + quantityChange;

    // Prevent negative stock
    if (newStock < 0) {
      throw new InsufficientStockError('Cannot decrease stock below zero', {
        productId,
        currentStock: product.stock || 0,
        requestedChange: quantityChange,
      });
    }

    // Use repository's updateStock method (transaction-safe)
    await this.productRepo.updateStock(productId, quantityChange);

    // Optionally update status based on stock level
    if (newStock === 0 && product.status !== 'out_of_stock') {
      await this.productRepo.update(productId, { status: 'out_of_stock' });
    } else if (newStock > 0 && product.status === 'out_of_stock') {
      await this.productRepo.update(productId, { status: 'available' });
    }
  }
}
