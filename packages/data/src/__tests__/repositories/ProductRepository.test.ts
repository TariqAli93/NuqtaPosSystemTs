import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, TestContext } from '../test-harness';
import { Product } from '@nuqtaplus/core';

describe('SqliteProductRepository', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('should create and retrieve a product', async () => {
    const product: Product = {
      name: 'Integration Test Product',
      costPrice: 50,
      sellingPrice: 100,
      stock: 20,
      minStock: 5,
      unit: 'piece',
      isActive: true,
      currency: 'USD',
      sku: 'SKU-123',
      status: 'available',
    };

    const created = await ctx.repositories.product.create(product);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Integration Test Product');

    const retrieved = await ctx.repositories.product.findById(created.id!);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.sku).toBe('SKU-123');
  });

  it('should update stock correctly', async () => {
    const product = await ctx.repositories.product.create({
      name: 'Stock Test',
      costPrice: 10,
      sellingPrice: 20,
      stock: 50,
      currency: 'USD',
      status: 'available',
    } as Product);

    await ctx.repositories.product.updateStock(product.id!, -5);
    const updated = await ctx.repositories.product.findById(product.id!);
    expect(updated?.stock).toBe(45);
  });
});
