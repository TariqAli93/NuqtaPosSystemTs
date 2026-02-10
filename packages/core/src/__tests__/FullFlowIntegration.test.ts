/**
 * Full Flow Integration Tests
 * Validates end-to-end flow from UI call through IPC to use case execution
 * Tests Phase 1-4 integration: real userId → typed errors → RBAC → audit logging
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CreateSaleUseCase,
  LoginUseCase,
  PermissionService,
  ValidationError,
  PermissionDeniedError,
} from '@nuqtaplus/core';
import {
  SqliteSaleRepository,
  SqliteProductRepository,
  SqliteCustomerRepository,
  SqliteSettingsRepository,
  SqlitePaymentRepository,
  SqliteUserRepository,
  SqliteAuditRepository,
} from '@nuqtaplus/data';
import {
  createTestDb,
  createTestProduct,
  createTestUser,
  createTestCurrencySettings,
} from '@nuqtaplus/data';
import * as bcrypt from 'bcrypt';

describe('Full Flow Integration (Phase 1-4)', () => {
  let db: any;
  let saleRepo: SqliteSaleRepository;
  let productRepo: SqliteProductRepository;
  let customerRepo: SqliteCustomerRepository;
  let settingsRepo: SqliteSettingsRepository;
  let paymentRepo: SqlitePaymentRepository;
  let userRepo: SqliteUserRepository;
  let auditRepo: SqliteAuditRepository;
  let loginUseCase: LoginUseCase;
  let createSaleUseCase: CreateSaleUseCase;

  beforeEach(async () => {
    db = createTestDb();
    saleRepo = new SqliteSaleRepository(db);
    productRepo = new SqliteProductRepository(db);
    customerRepo = new SqliteCustomerRepository(db);
    settingsRepo = new SqliteSettingsRepository(db);
    paymentRepo = new SqlitePaymentRepository(db);
    userRepo = new SqliteUserRepository(db);
    auditRepo = new SqliteAuditRepository(db);

    loginUseCase = new LoginUseCase(userRepo);
    createSaleUseCase = new CreateSaleUseCase(
      saleRepo,
      productRepo,
      customerRepo,
      settingsRepo,
      paymentRepo,
      auditRepo
    );

    // Setup test data
    await createTestCurrencySettings(db);
  });

  describe('Phase 1: Real UserID Tracking', () => {
    it('should persist userId throughout transaction', async () => {
      // Create user (cashier role)
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser(db, {
        username: 'cashier1',
        password: hashedPassword,
        role: 'cashier',
      });

      // Login to get userId
      const loginResult = await loginUseCase.execute({
        username: 'cashier1',
        password: 'password123',
      });

      expect(loginResult.user.id).toBe(user.id);

      // Create product and sale
      const product = await createTestProduct(db, { stock: 100 });

      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 5, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 500,
        },
        user.id! // Passing real userId
      );

      // Verify sale was created with correct userId
      expect(sale.createdBy).toBe(user.id);
    });
  });

  describe('Phase 2: Typed Error Handling', () => {
    it('should throw ValidationError with typed response', async () => {
      try {
        await createSaleUseCase.execute(
          {
            items: [], // Will fail validation
            paymentType: 'cash',
          },
          1
        );
        expect.fail('Should have thrown ValidationError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw InsufficientStockError with product details', async () => {
      const product = await createTestProduct(db, { stock: 5, name: 'Widget' });

      try {
        await createSaleUseCase.execute(
          {
            items: [{ productId: product.id, quantity: 10, unitPrice: 100 }],
            paymentType: 'cash',
          },
          1
        );
        expect.fail('Should have thrown InsufficientStockError');
      } catch (error: any) {
        expect(error.code).toBe('INSUFFICIENT_STOCK');
        expect(error.statusCode).toBe(409);
        expect(error.details.available).toBe(5);
        expect(error.details.requested).toBe(10);
      }
    });

    it('should throw NotFoundError for nonexistent product', async () => {
      try {
        await createSaleUseCase.execute(
          {
            items: [{ productId: 999, quantity: 1, unitPrice: 100 }],
            paymentType: 'cash',
          },
          1
        );
        expect.fail('Should have thrown NotFoundError');
      } catch (error: any) {
        expect(error.code).toBe('NOT_FOUND');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('Phase 3: RBAC Permission Checks', () => {
    it('should allow cashier to create sales', async () => {
      const product = await createTestProduct(db, { stock: 100 });

      // Simulate IPC handler permission check
      const userRole = 'cashier';
      const hasPermission = PermissionService.hasPermission(userRole, 'sales:create');
      expect(hasPermission).toBe(true);

      // Should succeed
      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 5, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 500,
        },
        1
      );

      expect(sale.id).toBeDefined();
    });

    it('should deny viewer from creating sales', () => {
      const userRole = 'viewer';
      const hasPermission = PermissionService.hasPermission(userRole, 'sales:create');
      expect(hasPermission).toBe(false);
    });

    it('should allow manager to read but not create products', () => {
      const managerRole = 'manager';
      expect(PermissionService.hasPermission(managerRole, 'products:read')).toBe(true);
      expect(PermissionService.hasPermission(managerRole, 'products:create')).toBe(false);
    });

    it('should allow admin all permissions', () => {
      const adminRole = 'admin';
      const allPermissions = PermissionService.getAllPermissions();

      allPermissions.forEach((permission) => {
        expect(PermissionService.hasPermission(adminRole, permission)).toBe(true);
      });
    });
  });

  describe('Phase 4: Audit Logging Integration', () => {
    it('should log sale creation automatically', async () => {
      const product = await createTestProduct(db, { stock: 100 });

      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 5, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 500,
        },
        1
      );

      // Verify audit entry was created
      const auditEvents = await auditRepo.getByFilters({
        entityType: 'Sale',
        entityId: sale.id,
      });

      expect(auditEvents.length).toBeGreaterThan(0);
      const event = auditEvents[0];
      expect(event.action).toBe('sales:create');
      expect(event.userId).toBe(1);
      expect(event.entityId).toBe(sale.id);
    });

    it('should include sale details in audit log', async () => {
      const product = await createTestProduct(db, { stock: 100 });

      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 5, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 500,
        },
        1
      );

      const auditEvents = await auditRepo.getByFilters({
        entityType: 'Sale',
        entityId: sale.id,
      });

      const event = auditEvents[0];
      expect(event.changeDescription).toContain(sale.invoiceNumber);
      expect(event.changeDescription).toContain(sale.total.toString());
    });

    it('should track user who created sale', async () => {
      const hashedPassword = await bcrypt.hash('pass', 10);
      const manager = await createTestUser(db, {
        username: 'manager1',
        password: hashedPassword,
        role: 'manager',
      });

      const product = await createTestProduct(db, { stock: 100 });

      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 2, unitPrice: 50 }],
          paymentType: 'cash',
          paidAmount: 100,
        },
        manager.id! // Different user
      );

      const auditEvents = await auditRepo.getByFilters({
        entityType: 'Sale',
        entityId: sale.id,
      });

      expect(auditEvents[0].userId).toBe(manager.id);
    });

    it('should record audit trail for entity', async () => {
      const product = await createTestProduct(db, { stock: 100 });

      // Create sale
      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 5, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 500,
        },
        1
      );

      // Get full audit trail for this sale
      const trail = await auditRepo.getAuditTrail('Sale', sale.id!);

      expect(trail.length).toBeGreaterThan(0);
      expect(trail.some((e) => e.action === 'sales:create')).toBe(true);
    });
  });

  describe('Cross-Phase Integration Scenarios', () => {
    it('should handle complete workflow: login → create sale → audit log', async () => {
      // Phase 1+2+3+4 integration
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser(db, {
        username: 'integration_test',
        password: hashedPassword,
        role: 'cashier',
      });

      // Login
      const loginResult = await loginUseCase.execute({
        username: 'integration_test',
        password: 'password123',
      });

      // Verify permissions are loaded
      expect(loginResult.permissions).toContain('sales:create');
      expect(loginResult.permissions).not.toContain('users:create');

      // Create product
      const product = await createTestProduct(db, { stock: 100 });

      // Create sale with authenticated userId
      const sale = await createSaleUseCase.execute(
        {
          items: [{ productId: product.id, quantity: 10, unitPrice: 100 }],
          paymentType: 'cash',
          paidAmount: 1000,
        },
        loginResult.user.id!
      );

      // Verify complete flow
      expect(sale.id).toBeDefined();
      expect(sale.createdBy).toBe(loginResult.user.id);

      // Verify audit trail
      const auditTrail = await auditRepo.getAuditTrail('Sale', sale.id!);
      expect(auditTrail.length).toBeGreaterThan(0);
      expect(auditTrail[0].userId).toBe(loginResult.user.id);
    });

    it('should prevent unauthorized action (permission denied)', async () => {
      // Phase 3 enforces before Phase 2 error mapping
      const product = await createTestProduct(db, { stock: 100 });

      // Check viewer cannot create sale
      const viewerRole = 'viewer';
      const hasPermission = PermissionService.hasPermission(viewerRole, 'sales:create');

      expect(hasPermission).toBe(false);

      // In actual IPC handler, PermissionDeniedError would be thrown here
      // This demonstrates the permission guard prevents execution before use case
    });

    it('should include error details in IPC response', async () => {
      // Phase 2 error mapping
      const product = await createTestProduct(db, {
        name: 'Scarce Item',
        stock: 2,
      });

      try {
        await createSaleUseCase.execute(
          {
            items: [{ productId: product.id, quantity: 10, unitPrice: 100 }],
            paymentType: 'cash',
          },
          1
        );
        expect.fail('Should throw error');
      } catch (error: any) {
        // This error would be mapped by IpcErrorMapperService in real flow
        const ipcResponse = {
          error: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        };

        expect(ipcResponse.code).toBe('INSUFFICIENT_STOCK');
        expect(ipcResponse.statusCode).toBe(409);
        expect(ipcResponse.details.available).toBe(2);
        expect(ipcResponse.details.requested).toBe(10);
      }
    });
  });

  describe('Error Recovery and Consistency', () => {
    it('should maintain data consistency on validation error', async () => {
      const product = await createTestProduct(db, { stock: 100 });
      const initialStock = product.stock;

      try {
        await createSaleUseCase.execute(
          {
            items: [
              { productId: product.id, quantity: 150, unitPrice: 100 }, // Fails
            ],
            paymentType: 'cash',
          },
          1
        );
      } catch (error) {
        // Error expected
      }

      // Stock should not change
      const updatedProduct = await productRepo.findById(product.id);
      expect(updatedProduct!.stock).toBe(initialStock);
    });

    it('should not create audit log on validation error', async () => {
      const initialEvents = await auditRepo.getByFilters({});

      try {
        await createSaleUseCase.execute(
          {
            items: [], // Invalid
            paymentType: 'cash',
          },
          1
        );
      } catch (error) {
        // Expected
      }

      const finalEvents = await auditRepo.getByFilters({});
      expect(finalEvents.length).toBe(initialEvents.length);
    });
  });
});
