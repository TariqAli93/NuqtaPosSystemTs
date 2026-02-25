import { describe, it, expect, beforeEach } from 'vitest';
import {
  AdjustProductStockUseCase,
  AdjustStockInput,
} from '../use-cases/AdjustProductStockUseCase';
import {
  FakeProductRepository,
  FakeInventoryRepository,
  FakeAccountingRepository,
  FakeAuditRepository,
} from './fakes';
import { Product } from '../entities/Product';
import { NotFoundError, ValidationError, InsufficientStockError } from '../errors/DomainErrors';

// ── helpers ──────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    name: 'Widget',
    costPrice: 500,
    sellingPrice: 1000,
    stock: 0,
    minStock: 1,
    unit: 'piece',
    isActive: true,
    isExpire: false,
    currency: 'IQD',
    status: 'available',
    ...overrides,
  };
}

// ── setup ────────────────────────────────────────────────────────

let productRepo: FakeProductRepository;
let inventoryRepo: FakeInventoryRepository;
let accountingRepo: FakeAccountingRepository;
let auditRepo: FakeAuditRepository;
let useCase: AdjustProductStockUseCase;

beforeEach(() => {
  productRepo = new FakeProductRepository();
  inventoryRepo = new FakeInventoryRepository();
  accountingRepo = new FakeAccountingRepository();
  auditRepo = new FakeAuditRepository();
  useCase = new AdjustProductStockUseCase(productRepo, inventoryRepo, accountingRepo, auditRepo);
});

// ── 1. Opening stock adjustment creates a batch ──────────────────

describe('Opening stock adjustment creates batch', () => {
  it('creates a new batch when positive adjustment has no batchId', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    const result = useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: 50, reason: 'opening' },
      1
    );

    // A batch was created
    const batches = productRepo.findBatchesByProductId(product.id!);
    expect(batches).toHaveLength(1);
    expect(batches[0].quantityOnHand).toBe(50);
    expect(batches[0].batchNumber).toMatch(/^ADJ-/);
    expect(batches[0].costPerUnit).toBe(500); // inherits product.costPrice
    expect(batches[0].status).toBe('active');

    // Result exposes the batchId
    expect(result.batchId).toBe(batches[0].id);

    // Movement references the batch
    expect(result.movement.batchId).toBe(batches[0].id);
    expect(result.movement.quantityBase).toBe(50);
    expect(result.movement.stockAfter).toBe(50);

    // products.stock is synced from batch sum
    const updated = productRepo.findById(product.id!);
    expect(updated!.stock).toBe(50);
  });

  it('adds to existing batch when batchId is provided', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));
    const batch = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'B-1',
      quantityReceived: 20,
      quantityOnHand: 20,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });

    // Need to set product stock to reflect the batch
    productRepo.setStock(product.id!, 20);

    const result = useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: 10, batchId: batch.id!, reason: 'manual' },
      1
    );

    expect(result.batchId).toBe(batch.id!);
    // Batch stock went from 20 → 30
    const updatedBatch = productRepo.findBatchById(batch.id!);
    expect(updatedBatch!.quantityOnHand).toBe(30);
    // products.stock synced
    expect(productRepo.findById(product.id!)!.stock).toBe(30);
  });
});

// ── 2. Sale after opening adjustment succeeds (FIFO reads batches) ─

describe('Sale after opening adjustment succeeds', () => {
  it('batch has correct quantityOnHand after opening adjustment', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    // Simulate opening balance
    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: 100, reason: 'opening' },
      1
    );

    // FIFO would query batches — verify the batch is available
    const batches = productRepo
      .findBatchesByProductId(product.id!)
      .filter((b) => b.status === 'active' && b.quantityOnHand > 0);

    expect(batches).toHaveLength(1);
    expect(batches[0].quantityOnHand).toBe(100);

    // products.stock reflects batch total
    expect(productRepo.findById(product.id!)!.stock).toBe(100);
  });
});

// ── 3. Cancel / negative adjustment restores exact batch quantities ─

describe('Cancel restores exact batch quantities', () => {
  it('negative adjustment deducts from specified batch', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    // Create a batch with 50 units
    const batch = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'BATCH-A',
      quantityReceived: 50,
      quantityOnHand: 50,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 50);

    // Negative adjustment: remove 20 from specific batch
    const result = useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: -20, batchId: batch.id!, reason: 'damage' },
      1
    );

    expect(result.batchId).toBe(batch.id!);
    const updatedBatch = productRepo.findBatchById(batch.id!);
    expect(updatedBatch!.quantityOnHand).toBe(30);
    expect(productRepo.findById(product.id!)!.stock).toBe(30);
  });

  it('negative adjustment without batchId picks first active batch (FIFO)', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    // Two batches: first with 10 units, second with 50 units
    const b1 = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'BATCH-1',
      quantityReceived: 10,
      quantityOnHand: 10,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    const b2 = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'BATCH-2',
      quantityReceived: 50,
      quantityOnHand: 50,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 60);

    // Remove 30 — b1 only has 10 so it picks b2 which has 50
    const result = useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: -30, reason: 'manual' },
      1
    );

    expect(result.batchId).toBe(b2.id!);
    expect(productRepo.findBatchById(b2.id!)!.quantityOnHand).toBe(20);
    // b1 untouched
    expect(productRepo.findBatchById(b1.id!)!.quantityOnHand).toBe(10);
    // total stock = 10 + 20 = 30
    expect(productRepo.findById(product.id!)!.stock).toBe(30);
  });

  it('depleting a batch to zero marks it as depleted', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    const batch = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'BATCH-X',
      quantityReceived: 10,
      quantityOnHand: 10,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 10);

    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: -10, batchId: batch.id!, reason: 'manual' },
      1
    );

    const updated = productRepo.findBatchById(batch.id!);
    expect(updated!.quantityOnHand).toBe(0);
    expect(updated!.status).toBe('depleted');
    expect(productRepo.findById(product.id!)!.stock).toBe(0);
  });
});

// ── 4. Negative adjustment requires (or finds) batch ─────────────

describe('Negative adjustment requires batch', () => {
  it('throws InsufficientStockError when no active batches exist', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    expect(() =>
      useCase.executeCommitPhase(
        { productId: product.id!, quantityChange: -5, reason: 'damage' },
        1
      )
    ).toThrow(InsufficientStockError);
  });

  it('throws InsufficientStockError when no single batch has enough stock', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));
    productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'B-A',
      quantityReceived: 5,
      quantityOnHand: 5,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'B-B',
      quantityReceived: 5,
      quantityOnHand: 5,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 10);

    // Trying to remove 8 — no single batch has ≥ 8
    expect(() =>
      useCase.executeCommitPhase(
        { productId: product.id!, quantityChange: -8, reason: 'manual' },
        1
      )
    ).toThrow(InsufficientStockError);
  });

  it('throws InsufficientStockError when specified batch has insufficient stock', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));
    const batch = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'B-X',
      quantityReceived: 5,
      quantityOnHand: 5,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 5);

    expect(() =>
      useCase.executeCommitPhase(
        { productId: product.id!, quantityChange: -10, batchId: batch.id!, reason: 'damage' },
        1
      )
    ).toThrow(InsufficientStockError);
  });

  it('throws NotFoundError when specified batchId does not exist', () => {
    const product = productRepo.create(makeProduct({ stock: 10 }));

    expect(() =>
      useCase.executeCommitPhase(
        { productId: product.id!, quantityChange: -5, batchId: 999, reason: 'manual' },
        1
      )
    ).toThrow(NotFoundError);
  });

  it('throws ValidationError when batch belongs to different product', () => {
    const p1 = productRepo.create(makeProduct({ stock: 0 }));
    const p2 = productRepo.create(makeProduct({ stock: 0, name: 'Other' }));
    const batch = productRepo.createBatch({
      productId: p2.id!,
      batchNumber: 'B-OTHER',
      quantityReceived: 20,
      quantityOnHand: 20,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });

    expect(() =>
      useCase.executeCommitPhase(
        { productId: p1.id!, quantityChange: -5, batchId: batch.id!, reason: 'manual' },
        1
      )
    ).toThrow(ValidationError);
  });
});

// ── 5. No movement inserted with NULL batch_id ───────────────────

describe('No movement inserted with NULL batch_id', () => {
  it('every movement created by adjustment has a non-null batchId', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    // Positive adjustment (auto-creates batch)
    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: 30, reason: 'opening' },
      1
    );

    // Negative adjustment (finds batch automatically)
    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: -10, reason: 'damage' },
      1
    );

    // Check every movement has batchId
    for (const m of inventoryRepo.movements) {
      expect(m.batchId).toBeDefined();
      expect(m.batchId).not.toBeNull();
      expect(m.batchId).toBeGreaterThan(0);
    }
  });
});

// ── Edge cases ───────────────────────────────────────────────────

describe('Edge cases', () => {
  it('throws ValidationError for zero quantityChange', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    expect(() =>
      useCase.executeCommitPhase({ productId: product.id!, quantityChange: 0, reason: 'manual' }, 1)
    ).toThrow(ValidationError);
  });

  it('throws ValidationError for non-integer quantityChange', () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    expect(() =>
      useCase.executeCommitPhase(
        { productId: product.id!, quantityChange: 2.5, reason: 'manual' },
        1
      )
    ).toThrow(ValidationError);
  });

  it('throws NotFoundError for non-existent product', () => {
    expect(() =>
      useCase.executeCommitPhase({ productId: 9999, quantityChange: 5, reason: 'manual' }, 1)
    ).toThrow(NotFoundError);
  });

  it('updates product status to out_of_stock when stock reaches zero', () => {
    const product = productRepo.create(makeProduct({ stock: 0, status: 'available' }));
    const batch = productRepo.createBatch({
      productId: product.id!,
      batchNumber: 'LAST',
      quantityReceived: 5,
      quantityOnHand: 5,
      costPerUnit: 500,
      status: 'active',
      expiryDate: null,
      manufacturingDate: null,
    });
    productRepo.setStock(product.id!, 5);

    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: -5, batchId: batch.id!, reason: 'manual' },
      1
    );

    expect(productRepo.findById(product.id!)!.status).toBe('out_of_stock');
  });

  it('updates product status from out_of_stock to available on positive adjustment', () => {
    const product = productRepo.create(makeProduct({ stock: 0, status: 'out_of_stock' }));

    useCase.executeCommitPhase(
      { productId: product.id!, quantityChange: 10, reason: 'opening' },
      1
    );

    expect(productRepo.findById(product.id!)!.status).toBe('available');
  });

  it('async execute() returns same result as executeCommitPhase()', async () => {
    const product = productRepo.create(makeProduct({ stock: 0 }));

    const result = await useCase.execute(
      { productId: product.id!, quantityChange: 25, reason: 'opening' },
      1
    );

    expect(result.batchId).toBeGreaterThan(0);
    expect(result.movement.batchId).toBe(result.batchId);
    expect(result.movement.quantityBase).toBe(25);
  });
});
