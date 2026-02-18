import { IProductRepository } from '../interfaces/IProductRepository.js';
import { IInventoryRepository } from '../interfaces/IInventoryRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { InventoryMovement } from '../entities/InventoryMovement.js';
import { NotFoundError, ValidationError, InsufficientStockError } from '../errors/DomainErrors.js';

const ACCT_INVENTORY = '1200';
const ACCT_COGS = '5001';
const ACCT_REVENUE = '4001';

export interface AdjustStockInput {
  productId: number;
  quantityChange: number;
  reason?: 'manual' | 'damage' | 'opening';
  notes?: string;
  batchId?: number;
  unitName?: string;
  unitFactor?: number;
  createdBy?: number;
}

export class AdjustProductStockUseCase {
  constructor(
    private productRepo: IProductRepository,
    private inventoryRepo: IInventoryRepository,
    private accountingRepo?: IAccountingRepository
  ) {}

  executeCommitPhase(input: AdjustStockInput, userId: number): InventoryMovement {
    if (!Number.isInteger(input.quantityChange)) {
      throw new ValidationError('Quantity change must be an integer');
    }

    if (input.quantityChange === 0) {
      throw new ValidationError('Quantity change cannot be zero');
    }

    const product = this.productRepo.findById(input.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const stockBefore = product.stock || 0;
    const stockAfter = stockBefore + input.quantityChange;

    if (stockAfter < 0) {
      throw new InsufficientStockError('Cannot decrease stock below zero', {
        productId: input.productId,
        currentStock: stockBefore,
        requestedChange: input.quantityChange,
      });
    }

    const movement = this.inventoryRepo.createMovementSync({
      productId: input.productId,
      batchId: input.batchId,
      movementType: 'adjust',
      reason: input.reason || 'manual',
      quantityBase: input.quantityChange,
      unitName: input.unitName || product.unit || 'piece',
      unitFactor: input.unitFactor || 1,
      stockBefore,
      stockAfter,
      costPerUnit: product.costPrice,
      totalCost: Math.abs(input.quantityChange) * product.costPrice,
      sourceType: 'adjustment',
      notes: input.notes,
      createdBy: userId,
    });

    this.productRepo.updateStock(input.productId, input.quantityChange);

    if (input.batchId) {
      this.productRepo.updateBatchStock(input.batchId, input.quantityChange);
    }

    if (stockAfter === 0 && product.status !== 'out_of_stock') {
      this.productRepo.update(input.productId, { status: 'out_of_stock' });
    } else if (stockAfter > 0 && product.status === 'out_of_stock') {
      this.productRepo.update(input.productId, { status: 'available' });
    }

    this.createAdjustmentJournalIfPossible(product.costPrice, input.quantityChange, movement.id, userId);

    return movement;
  }

  private createAdjustmentJournalIfPossible(
    costPrice: number,
    quantityChange: number,
    movementId: number | undefined,
    userId: number
  ): void {
    if (!this.accountingRepo) {
      return;
    }

    const amount = Math.abs(quantityChange * costPrice);
    if (amount <= 0) return;

    const inventoryAcct = this.accountingRepo.findAccountByCode(ACCT_INVENTORY);
    const cogsAcct = this.accountingRepo.findAccountByCode(ACCT_COGS);
    const revenueAcct = this.accountingRepo.findAccountByCode(ACCT_REVENUE);

    if (!inventoryAcct?.id) return;

    if (quantityChange < 0 && cogsAcct?.id) {
      this.accountingRepo.createJournalEntrySync({
        entryNumber: `JE-ADJ-${movementId || Date.now()}`,
        entryDate: new Date().toISOString(),
        description: 'Inventory shrinkage adjustment',
        sourceType: 'adjustment',
        sourceId: movementId,
        isPosted: true,
        isReversed: false,
        totalAmount: amount,
        currency: 'IQD',
        createdBy: userId,
        lines: [
          { accountId: cogsAcct.id, debit: amount, credit: 0, description: 'Shrinkage expense' },
          {
            accountId: inventoryAcct.id,
            debit: 0,
            credit: amount,
            description: 'Inventory decrease',
          },
        ],
      });
    } else if (quantityChange > 0 && revenueAcct?.id) {
      this.accountingRepo.createJournalEntrySync({
        entryNumber: `JE-ADJ-${movementId || Date.now()}`,
        entryDate: new Date().toISOString(),
        description: 'Inventory gain adjustment',
        sourceType: 'adjustment',
        sourceId: movementId,
        isPosted: true,
        isReversed: false,
        totalAmount: amount,
        currency: 'IQD',
        createdBy: userId,
        lines: [
          {
            accountId: inventoryAcct.id,
            debit: amount,
            credit: 0,
            description: 'Inventory increase',
          },
          {
            accountId: revenueAcct.id,
            debit: 0,
            credit: amount,
            description: 'Adjustment gain',
          },
        ],
      });
    }
  }

  async execute(input: AdjustStockInput, userId: number): Promise<InventoryMovement> {
    return this.executeCommitPhase(input, userId);
  }
}
