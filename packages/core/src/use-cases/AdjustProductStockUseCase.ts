import { IProductRepository } from '../interfaces/IProductRepository.js';
import { IInventoryRepository } from '../interfaces/IInventoryRepository.js';
import { IAccountingRepository } from '../interfaces/IAccountingRepository.js';
import { IAuditRepository } from '../interfaces/IAuditRepository.js';
import { AuditService } from '../services/AuditService.js';
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

export interface AdjustStockResult {
  movement: InventoryMovement;
  batchId: number;
}

export class AdjustProductStockUseCase {
  private auditService: AuditService;

  constructor(
    private productRepo: IProductRepository,
    private inventoryRepo: IInventoryRepository,
    private accountingRepo?: IAccountingRepository,
    auditRepo?: IAuditRepository
  ) {
    this.auditService = new AuditService(auditRepo as IAuditRepository);
  }

  executeCommitPhase(input: AdjustStockInput, userId: number): AdjustStockResult {
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

    // ── Resolve or create batch ──────────────────────────────────
    let batchId: number;

    if (input.quantityChange > 0) {
      // CASE A: Positive adjustment — add to existing batch or create new one
      if (input.batchId) {
        const existing = this.productRepo.findBatchById(input.batchId);
        if (!existing) {
          throw new NotFoundError(`Batch ${input.batchId} not found`);
        }
        if (existing.productId !== input.productId) {
          throw new ValidationError('Batch does not belong to this product');
        }
        this.productRepo.updateBatchStock(input.batchId, input.quantityChange);
        batchId = input.batchId;
      } else {
        // Auto-create a new batch
        const batchNumber = `ADJ-${input.productId}-${Date.now()}`;
        const newBatch = this.productRepo.createBatch({
          productId: input.productId,
          batchNumber,
          expiryDate: product.isExpire ? null : null, // caller should supply if needed
          manufacturingDate: null,
          quantityReceived: input.quantityChange,
          quantityOnHand: input.quantityChange,
          costPerUnit: product.costPrice || 0,
          status: 'active',
        });
        batchId = newBatch.id!;
      }
    } else {
      // CASE B: Negative adjustment — must target a specific batch
      if (input.batchId) {
        const existing = this.productRepo.findBatchById(input.batchId);
        if (!existing) {
          throw new NotFoundError(`Batch ${input.batchId} not found`);
        }
        if (existing.productId !== input.productId) {
          throw new ValidationError('Batch does not belong to this product');
        }
        if (existing.quantityOnHand + input.quantityChange < 0) {
          throw new InsufficientStockError('Cannot decrease batch stock below zero', {
            batchId: input.batchId,
            currentStock: existing.quantityOnHand,
            requestedChange: input.quantityChange,
          });
        }
        this.productRepo.updateBatchStock(input.batchId, input.quantityChange);
        batchId = input.batchId;
      } else {
        // No batchId for negative — try to find a batch with enough stock (FIFO order)
        const batches = this.productRepo
          .findBatchesByProductId(input.productId)
          .filter((b) => b.status === 'active' && b.quantityOnHand > 0);

        if (batches.length === 0) {
          throw new InsufficientStockError('No active batches available for negative adjustment', {
            productId: input.productId,
            requestedChange: input.quantityChange,
          });
        }

        // Take from first batch with enough stock
        const absChange = Math.abs(input.quantityChange);
        const target = batches.find((b) => b.quantityOnHand >= absChange);
        if (!target) {
          throw new InsufficientStockError('No single batch has enough stock for this adjustment', {
            productId: input.productId,
            requestedChange: input.quantityChange,
          });
        }

        this.productRepo.updateBatchStock(target.id!, input.quantityChange);
        batchId = target.id!;
      }
    }

    // ── Recalculate products.stock as SUM(batches.quantity_on_hand) ──
    const allBatches = this.productRepo.findBatchesByProductId(input.productId);
    const totalBatchStock = allBatches.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
    const stockBefore = product.stock || 0;
    const stockAfter = totalBatchStock;

    this.productRepo.setStock(input.productId, stockAfter);

    // ── Create inventory movement (always with batch_id) ─────────
    const movement = this.inventoryRepo.createMovementSync({
      productId: input.productId,
      batchId,
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

    // ── Update product status ────────────────────────────────────
    if (stockAfter === 0 && product.status !== 'out_of_stock') {
      this.productRepo.update(input.productId, { status: 'out_of_stock' });
    } else if (stockAfter > 0 && product.status === 'out_of_stock') {
      this.productRepo.update(input.productId, { status: 'available' });
    }

    // ── Journal entry ────────────────────────────────────────────
    this.createAdjustmentJournalIfPossible(
      product.costPrice,
      input.quantityChange,
      movement.id,
      userId
    );

    return { movement, batchId };
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
        isPosted: false,
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
        isPosted: false,
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

  async execute(input: AdjustStockInput, userId: number): Promise<AdjustStockResult> {
    const result = this.executeCommitPhase(input, userId);
    await this.executeSideEffectsPhase(result, input, userId);
    return result;
  }

  async executeSideEffectsPhase(
    result: AdjustStockResult,
    input: AdjustStockInput,
    userId: number
  ): Promise<void> {
    try {
      await this.auditService.logAction(
        userId,
        'stock:adjust',
        'Product',
        input.productId,
        `Stock adjusted by ${input.quantityChange} for product ${input.productId}`,
        {
          quantityChange: input.quantityChange,
          reason: input.reason || 'manual',
          batchId: result.batchId,
          movementId: result.movement.id,
        }
      );
    } catch (error) {
      console.warn('Audit logging failed for stock adjustment:', error);
    }
  }
}
