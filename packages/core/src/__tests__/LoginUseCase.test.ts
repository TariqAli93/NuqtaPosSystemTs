import { describe, it, expect, beforeEach } from 'vitest';
import {
  LoginUseCase,
  ValidationError,
  UnauthorizedError,
  PermissionService,
} from '@nuqtaplus/core';
import { hashPassword } from '../utils/helpers.js';
import type { IUserRepository } from '../interfaces/IUserRepository.js';
import type { User } from '../entities/User.js';

class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  private nextId = 1;

  findByUsername(username: string): User | null {
    return this.users.find((u) => u.username === username) || null;
  }

  findById(id: number): User | null {
    return this.users.find((u) => u.id === id) || null;
  }

  create(user: User): User {
    const created = {
      ...user,
      id: user.id ?? this.nextId++,
      createdAt: user.createdAt ?? new Date().toISOString(),
      updatedAt: user.updatedAt ?? new Date().toISOString(),
    };
    this.users.push(created);
    return created;
  }

  findAll(): User[] {
    return [...this.users];
  }

  update(id: number, data: Partial<User>): User {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx < 0) throw new Error('User not found');
    this.users[idx] = {
      ...this.users[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.users[idx];
  }

  count(): number {
    return this.users.length;
  }

  updateLastLogin(id: number): void {
    this.update(id, { lastLoginAt: new Date().toISOString() });
  }
}

describe('LoginUseCase', () => {
  let userRepo: InMemoryUserRepository;
  let useCase: LoginUseCase;

  const seedUser = async (overrides: Partial<User> = {}): Promise<User> => {
    const password = overrides.password ?? (await hashPassword('password123'));
    return userRepo.create({
      username: 'cashier',
      password,
      fullName: 'Cashier User',
      role: 'cashier',
      isActive: true,
      phone: null,
      lastLoginAt: null,
      ...overrides,
    });
  };

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    useCase = new LoginUseCase(userRepo);
  });

  it('rejects empty username', async () => {
    await expect(useCase.execute({ username: '', password: 'password123' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('rejects empty password', async () => {
    await expect(useCase.execute({ username: 'cashier', password: '' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('rejects unknown username', async () => {
    await expect(
      useCase.execute({ username: 'missing-user', password: 'password123' })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('rejects inactive users', async () => {
    await seedUser({ username: 'inactive', isActive: false });
    await expect(
      useCase.execute({ username: 'inactive', password: 'password123' })
    ).rejects.toThrow(ValidationError);
  });

  it('returns user + permissions and updates last login', async () => {
    const seeded = await seedUser({ username: 'manager', role: 'manager' });

    const result = await useCase.execute({
      username: 'manager',
      password: 'password123',
    });

    expect(result.user.id).toBe(seeded.id);
    expect(result.user.username).toBe('manager');
    expect((result.user as any).password).toBeUndefined();
    expect(result.permissions).toEqual(PermissionService.getPermissionsForRole('manager'));

    const updated = userRepo.findById(seeded.id!);
    expect(updated?.lastLoginAt).toBeDefined();
  });
});

