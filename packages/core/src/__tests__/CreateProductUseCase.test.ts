import { describe, it, expect } from 'vitest';
import { CreateProductUseCase } from '../use-cases/CreateProductUseCase';
import { FakeProductRepository } from './fakes';
import { Product } from '../entities/Product';
import { ValidationError } from '../errors/DomainErrors';

describe('CreateProductUseCase', () => {
  it('should create a valid product', async () => {
    const repo = new FakeProductRepository();
    const useCase = new CreateProductUseCase(repo);

    const input: Product = {
      name: 'Test Product',
      costPrice: 10,
      sellingPrice: 15,
      stock: 100,
      minStock: 5,
      unit: 'piece',
      isActive: true,
      isExpire: false,
      currency: 'IQD',
      status: 'available',
    };

    const result = await useCase.execute(input);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test Product');
    expect(result.stock).toBe(100);
  });

  it('should throw validation error for empty name', async () => {
    const repo = new FakeProductRepository();
    const useCase = new CreateProductUseCase(repo);

    const input = {
      name: '',
      costPrice: 10,
      sellingPrice: 15,
      stock: 100,
    } as Product;

    await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
  });

  it('should throw validation error for negative prices', async () => {
    const repo = new FakeProductRepository();
    const useCase = new CreateProductUseCase(repo);

    const input = {
      name: 'Bad Product',
      costPrice: -10,
      sellingPrice: 15,
      stock: 100,
    } as Product;

    await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
  });
});
