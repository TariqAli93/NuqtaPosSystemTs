import { Category } from '../entities/Category.js';

export interface ICategoryRepository {
  findAll(): Category[];
  findById(id: number): Category | null;
  create(category: Category): Category;
  update(id: number, category: Partial<Category>): Category;
  delete(id: number): void;
}
