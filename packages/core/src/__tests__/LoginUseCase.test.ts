/**
 * LoginUseCase Tests
 * Validates authentication flow, permission loading, and role handling
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LoginUseCase,
  ValidationError,
  UnauthorizedError,
  PermissionService,
} from '@nuqtaplus/core';
import { SqliteUserRepository } from '@nuqtaplus/data';
import { createTestDb, createTestUser } from '@nuqtaplus/data';
import * as bcrypt from 'bcrypt';

describe('LoginUseCase', () => {
  let db: any;
  let userRepo: SqliteUserRepository;
  let useCase: LoginUseCase;

  beforeEach(async () => {
    db = createTestDb();
    userRepo = new SqliteUserRepository(db);
    useCase = new LoginUseCase(userRepo);
  });

  describe('Validation', () => {
    it('should reject empty username', async () => {
      await expect(
        useCase.execute({
          username: '',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject empty password', async () => {
      await expect(
        useCase.execute({
          username: 'testuser',
          password: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject both empty credentials', async () => {
      await expect(
        useCase.execute({
          username: '',
          password: '',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Authentication', () => {
    it('should reject nonexistent user', async () => {
      await expect(
        useCase.execute({
          username: 'nonexistent',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
      });

      await expect(
        useCase.execute({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject inactive user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'inactiveuser',
        password: hashedPassword,
        isActive: false,
      });

      await expect(
        useCase.execute({
          username: 'inactiveuser',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Successful Login', () => {
    it('should return user on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const testUser = await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
        fullName: 'Test User',
        role: 'cashier',
      });

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
      expect(result.user.username).toBe('testuser');
      expect(result.user.fullName).toBe('Test User');
    });

    it('should update last login timestamp', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const testUser = await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
        lastLoginAt: null,
      });

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user.lastLoginAt).toBeDefined();
      // Check that timestamp was updated (not null)
      expect(result.user.lastLoginAt).not.toBeNull();
    });

    it('should return token on login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
      });

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });
  });

  describe('Permissions Loading', () => {
    it('should return permissions array for cashier role', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'cashier',
        password: hashedPassword,
        role: 'cashier',
      });

      const result = await useCase.execute({
        username: 'cashier',
        password: 'password123',
      });

      expect(Array.isArray(result.permissions)).toBe(true);
      expect(result.permissions.length).toBeGreaterThan(0);
      // Cashier should have sales:create
      expect(result.permissions).toContain('sales:create');
    });

    it('should return more permissions for admin role', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      const cashierUser = await createTestUser(db, {
        username: 'cashier',
        password: hashedPassword,
        role: 'cashier',
      });

      const adminUser = await createTestUser(db, {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });

      const cashierResult = await useCase.execute({
        username: 'cashier',
        password: 'password123',
      });

      const adminResult = await useCase.execute({
        username: 'admin',
        password: 'password123',
      });

      expect(adminResult.permissions.length).toBeGreaterThan(cashierResult.permissions.length);
    });

    it('should return viewer-only permissions for viewer role', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'viewer',
        password: hashedPassword,
        role: 'viewer',
      });

      const result = await useCase.execute({
        username: 'viewer',
        password: 'password123',
      });

      // Viewer should only have read permissions
      const hasWriteOp = result.permissions.some(
        (p) => p.includes('create') || p.includes('update') || p.includes('delete')
      );

      expect(hasWriteOp).toBe(false);
      expect(result.permissions.some((p) => p.includes('read'))).toBe(true);
    });

    it('should return admin all permissions', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });

      const result = await useCase.execute({
        username: 'admin',
        password: 'password123',
      });

      const allPermissions = PermissionService.getAllPermissions();
      expect(result.permissions.length).toBe(allPermissions.length);
    });

    it('should use PermissionService for consistent permission matrix', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'manager',
        password: hashedPassword,
        role: 'manager',
      });

      const result = await useCase.execute({
        username: 'manager',
        password: 'password123',
      });

      const expectedPermissions = PermissionService.getPermissionsForRole('manager');

      expect(result.permissions).toEqual(expectedPermissions);
    });
  });

  describe('Return Structure', () => {
    it('should return complete login result', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
        role: 'cashier',
      });

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('permissions');

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('fullName');
      expect(result.user).toHaveProperty('role');
    });

    it('should not return password in user object', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
      });

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect((result.user as any).password).toBeUndefined();
    });
  });

  describe('Multiple Login Attempts', () => {
    it('should allow repeated logins', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'testuser',
        password: hashedPassword,
      });

      const result1 = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      const result2 = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result1.user.id).toBe(result2.user.id);
      // Tokens should be different (new token on each login)
      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('Edge Cases', () => {
    it('should handle username with special characters', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'user@domain.com',
        password: hashedPassword,
      });

      const result = await useCase.execute({
        username: 'user@domain.com',
        password: 'password123',
      });

      expect(result.user.username).toBe('user@domain.com');
    });

    it('should be case-sensitive for username', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser(db, {
        username: 'TestUser',
        password: hashedPassword,
      });

      // Assuming case-sensitive username
      await expect(
        useCase.execute({
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
