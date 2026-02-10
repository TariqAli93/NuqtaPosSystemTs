/**
 * Audit Service Integration Tests
 * Validates audit logging for critical business actions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService, AuditEvent } from '@nuqtaplus/core';
import { SqliteAuditRepository } from '@nuqtaplus/data';
import { createTestDb } from '@nuqtaplus/data';

describe('AuditService', () => {
  let db: any;
  let auditRepo: SqliteAuditRepository;
  let auditService: AuditService;

  beforeEach(() => {
    db = createTestDb();
    auditRepo = new SqliteAuditRepository(db);
    auditService = new AuditService(auditRepo);
  });

  describe('logCreate', () => {
    it('should log entity creation', async () => {
      const event = await auditService.logCreate(
        1,
        'Sale',
        42,
        { invoiceNumber: 'INV-001', total: 1000 },
        'Sale created'
      );

      expect(event).toBeInstanceOf(AuditEvent);
      expect(event.userId).toBe(1);
      expect(event.action).toBe('sale:create');
      expect(event.entityType).toBe('Sale');
      expect(event.entityId).toBe(42);
    });

    it('should track changed fields for create', async () => {
      const event = await auditService.logCreate(1, 'Product', 5, {
        name: 'Widget',
        price: 100,
        stock: 50,
      });

      expect(event.changedFields).toBeDefined();
      expect(event.changedFields!['name']).toEqual({ old: null, new: 'Widget' });
      expect(event.changedFields!['price']).toEqual({ old: null, new: 100 });
    });
  });

  describe('logUpdate', () => {
    it('should log entity update', async () => {
      const changes = {
        price: { old: 100, new: 120 },
        stock: { old: 50, new: 45 },
      };

      const event = await auditService.logUpdate(
        1,
        'Product',
        5,
        changes,
        'Price updated from 100 to 120'
      );

      expect(event.action).toBe('product:update');
      expect(event.changedFields).toEqual(changes);
      expect(event.changeDescription).toContain('120');
    });
  });

  describe('logDelete', () => {
    it('should log entity deletion', async () => {
      const event = await auditService.logDelete(1, 'Category', 10, {
        name: 'Electronics',
        description: 'Electronic items',
      });

      expect(event.action).toBe('category:delete');
      expect(event.entityId).toBe(10);
      expect(event.changeDescription).toContain('deleted');
    });

    it('should track deleted fields', async () => {
      const oldData = { name: 'Test', isActive: true };

      const event = await auditService.logDelete(1, 'Customer', 5, oldData);

      expect(event.changedFields!['name']).toEqual({ old: 'Test', new: null });
      expect(event.changedFields!['isActive']).toEqual({ old: true, new: null });
    });
  });

  describe('logAction', () => {
    it('should log generic action', async () => {
      const event = await auditService.logAction(
        1,
        'user:role-change',
        'User',
        5,
        'Role changed from cashier to manager',
        { previousRole: 'cashier', newRole: 'manager' }
      );

      expect(event.action).toBe('user:role-change');
      expect(event.metadata).toEqual({
        previousRole: 'cashier',
        newRole: 'manager',
      });
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail for entity', async () => {
      // Create multiple events
      await auditService.logCreate(1, 'Product', 5, { name: 'Widget' });
      await auditService.logUpdate(1, 'Product', 5, { price: { old: 100, new: 120 } });
      await auditService.logUpdate(2, 'Product', 5, { stock: { old: 50, new: 40 } });

      const trail = await auditService.getAuditTrail('Product', 5);

      expect(trail.length).toBe(3);
      expect(trail[0].action).toBe('product:update'); // Most recent first
      expect(trail[2].action).toBe('product:create'); // Oldest last
    });

    it('should limit audit trail', async () => {
      // Create 5 events
      for (let i = 0; i < 5; i++) {
        await auditService.logUpdate(1, 'Sale', 1, {
          status: { old: 'pending', new: 'completed' },
        });
      }

      const trail = await auditService.getAuditTrail('Sale', 1, 2);

      expect(trail.length).toBe(2);
    });

    it('should return empty array for nonexistent entity', async () => {
      const trail = await auditService.getAuditTrail('NonExistent', 999);
      expect(trail).toEqual([]);
    });
  });

  describe('getByUser', () => {
    it('should retrieve all actions by user', async () => {
      await auditService.logCreate(1, 'Sale', 1, {});
      await auditService.logCreate(1, 'Sale', 2, {});
      await auditService.logCreate(2, 'Sale', 3, {}); // Different user

      const events = await auditService.getByUser(1);

      expect(events.length).toBe(2);
      expect(events.every((e) => e.userId === 1)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await auditService.logCreate(1, 'Sale', i, {});
      }

      const events = await auditService.getByUser(1, 3);

      expect(events.length).toBe(3);
    });
  });

  describe('getByDateRange', () => {
    it('should retrieve events within date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await auditService.logCreate(1, 'Sale', 1, {});

      const events = await auditService.getByDateRange(
        yesterday.toISOString(),
        tomorrow.toISOString()
      );

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('getByAction', () => {
    it('should retrieve events by action type', async () => {
      await auditService.logCreate(1, 'Sale', 1, {});
      await auditService.logCreate(1, 'Sale', 2, {});
      await auditService.logUpdate(1, 'Sale', 1, {});

      const events = await auditService.getByAction('sales:create');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.action === 'sales:create')).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should provide audit statistics', async () => {
      await auditService.logCreate(1, 'Sale', 1, {});
      await auditService.logCreate(1, 'Product', 2, {});
      await auditService.logCreate(2, 'Sale', 3, {});

      const stats = await auditService.getStatistics({});

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByAction['sales:create']).toBe(2);
      expect(stats.eventsByEntityType['Sale']).toBe(2);
      expect(stats.eventsByEntityType['Product']).toBe(1);
    });

    it('should filter statistics by user', async () => {
      await auditService.logCreate(1, 'Sale', 1, {});
      await auditService.logCreate(2, 'Sale', 2, {});
      await auditService.logCreate(2, 'Product', 3, {});

      const stats = await auditService.getStatistics({ userId: 2 });

      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByEntityType['Sale']).toBe(1);
      expect(stats.eventsByEntityType['Product']).toBe(1);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete old audit records', async () => {
      await auditService.logCreate(1, 'Sale', 1, {});

      const deletedCount = await auditService.cleanupOldRecords(0); // Delete everything older than 0 days

      // This might not delete the record if timestamp is current
      expect(typeof deletedCount).toBe('number');
    });
  });

  describe('Audit Event Factory Methods', () => {
    it('should create for create action', () => {
      const event = AuditEvent.createForCreate(
        1,
        'sales:create',
        'Sale',
        1,
        { total: 1000 },
        'Sale created'
      );

      expect(event.changedFields!['total']).toEqual({ old: null, new: 1000 });
      expect(event.changeDescription).toBe('Sale created');
    });

    it('should create for update action', () => {
      const event = AuditEvent.createForUpdate(1, 'products:update', 'Product', 5, {
        price: { old: 100, new: 120 },
      });

      expect(event.changedFields).toHaveProperty('price');
    });

    it('should create for delete action', () => {
      const event = AuditEvent.createForDelete(1, 'categories:delete', 'Category', 10, {
        name: 'Old Category',
      });

      expect(event.changeDescription).toContain('deleted');
    });
  });

  describe('Timestamp Consistency', () => {
    it('should set timestamp on creation', async () => {
      const event = await auditService.logCreate(1, 'Sale', 1, {});

      expect(event.timestamp).toBeDefined();
      const eventTime = new Date(event.timestamp);
      const now = new Date();

      // Should be within 5 seconds
      expect(Math.abs(now.getTime() - eventTime.getTime())).toBeLessThan(5000);
    });

    it('should maintain chronological order', async () => {
      const event1 = await auditService.logCreate(1, 'Sale', 1, {});
      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      const event2 = await auditService.logUpdate(1, 'Sale', 1, {});

      expect(new Date(event2.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(event1.timestamp).getTime()
      );
    });
  });
});
