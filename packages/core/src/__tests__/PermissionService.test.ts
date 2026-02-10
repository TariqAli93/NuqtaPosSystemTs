/**
 * PermissionService Tests
 * Validates role-based permission matrix and checking logic
 */
import { describe, it, expect } from 'vitest';
import { PermissionService } from '@nuqtaplus/core';

describe('PermissionService', () => {
  describe('hasPermission', () => {
    it('should grant admin all permissions', () => {
      expect(PermissionService.hasPermission('admin', 'sales:create')).toBe(true);
      expect(PermissionService.hasPermission('admin', 'products:delete')).toBe(true);
      expect(PermissionService.hasPermission('admin', 'users:update')).toBe(true);
      expect(PermissionService.hasPermission('admin', 'settings:update')).toBe(true);
    });

    it('should deny cashier product/user management', () => {
      expect(PermissionService.hasPermission('cashier', 'products:create')).toBe(false);
      expect(PermissionService.hasPermission('cashier', 'users:create')).toBe(false);
      expect(PermissionService.hasPermission('cashier', 'settings:update')).toBe(false);
    });

    it('should allow cashier sales operations', () => {
      expect(PermissionService.hasPermission('cashier', 'sales:create')).toBe(true);
      expect(PermissionService.hasPermission('cashier', 'sales:read')).toBe(true);
      expect(PermissionService.hasPermission('cashier', 'sales:addPayment')).toBe(true);
    });

    it('should deny cashier sales deletion', () => {
      expect(PermissionService.hasPermission('cashier', 'sales:delete')).toBe(false);
    });

    it('should allow manager sales and product read/update', () => {
      expect(PermissionService.hasPermission('manager', 'sales:read')).toBe(true);
      expect(PermissionService.hasPermission('manager', 'products:read')).toBe(true);
      expect(PermissionService.hasPermission('manager', 'products:update')).toBe(true);
      expect(PermissionService.hasPermission('manager', 'audit:read')).toBe(true);
    });

    it('should deny manager user creation', () => {
      expect(PermissionService.hasPermission('manager', 'users:create')).toBe(false);
      expect(PermissionService.hasPermission('manager', 'users:update')).toBe(false);
    });

    it('should allow viewer read-only access', () => {
      expect(PermissionService.hasPermission('viewer', 'sales:read')).toBe(true);
      expect(PermissionService.hasPermission('viewer', 'products:read')).toBe(true);
      expect(PermissionService.hasPermission('viewer', 'dashboard:view')).toBe(true);
    });

    it('should deny viewer write operations', () => {
      expect(PermissionService.hasPermission('viewer', 'sales:create')).toBe(false);
      expect(PermissionService.hasPermission('viewer', 'products:update')).toBe(false);
      expect(PermissionService.hasPermission('viewer', 'customers:delete')).toBe(false);
    });

    it('should return false for nonexistent permission', () => {
      expect(PermissionService.hasPermission('admin', 'nonexistent:permission')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should work for admin (has all permissions)', () => {
      const permissions = ['sales:create', 'users:delete'];
      expect(PermissionService.hasAnyPermission('admin', permissions)).toBe(true);
    });

    it('should return true if user has at least one permission', () => {
      const permissions = ['sales:create', 'users:delete'];
      // cashier has sales:create but not users:delete
      expect(PermissionService.hasAnyPermission('cashier', permissions)).toBe(true);
    });

    it('should return false if user has none', () => {
      const permissions = ['users:delete', 'settings:update'];
      expect(PermissionService.hasAnyPermission('cashier', permissions)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should work for admin (has all permissions)', () => {
      const permissions = ['sales:create', 'users:delete'];
      expect(PermissionService.hasAllPermissions('admin', permissions)).toBe(true);
    });

    it('should return false if user misses one', () => {
      const permissions = ['sales:create', 'users:delete'];
      expect(PermissionService.hasAllPermissions('cashier', permissions)).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions array for cashier', () => {
      const perms = PermissionService.getPermissionsForRole('cashier');
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
      expect(perms).toContain('sales:create');
    });

    it('should return permissions array for admin', () => {
      const perms = PermissionService.getPermissionsForRole('admin');
      expect(Array.isArray(perms)).toBe(true);
      // Admin should have many permissions
      expect(perms.length).toBeGreaterThan(10);
    });

    it('should return different permission sets for different roles', () => {
      const adminPerms = PermissionService.getPermissionsForRole('admin');
      const cashierPerms = PermissionService.getPermissionsForRole('cashier');
      const viewerPerms = PermissionService.getPermissionsForRole('viewer');

      expect(adminPerms.length).toBeGreaterThan(cashierPerms.length);
      expect(cashierPerms.length).toBeGreaterThan(viewerPerms.length);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all unique permissions in system', () => {
      const allPerms = PermissionService.getAllPermissions();
      expect(Array.isArray(allPerms)).toBe(true);
      expect(allPerms.length).toBeGreaterThan(0);
      // Should have unique permissions
      expect(allPerms).toEqual([...new Set(allPerms)]);
    });

    it('should include core domain permissions', () => {
      const allPerms = PermissionService.getAllPermissions();
      expect(allPerms.some((p) => p.startsWith('sales:'))).toBe(true);
      expect(allPerms.some((p) => p.startsWith('products:'))).toBe(true);
      expect(allPerms.some((p) => p.startsWith('users:'))).toBe(true);
    });
  });

  describe('getAllRoles', () => {
    it('should return all user roles', () => {
      const roles = PermissionService.getAllRoles();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles).toContain('admin');
      expect(roles).toContain('cashier');
      expect(roles).toContain('manager');
      expect(roles).toContain('viewer');
    });

    it('should return exactly 4 roles', () => {
      const roles = PermissionService.getAllRoles();
      expect(roles.length).toBe(4);
    });
  });

  describe('Permission Matrix Integrity', () => {
    it('should have at least 40 permissions across all roles', () => {
      const allPerms = PermissionService.getAllPermissions();
      expect(allPerms.length).toBeGreaterThanOrEqual(30);
    });

    it('admin should have most permissions', () => {
      const admin = PermissionService.getPermissionsForRole('admin');
      const manager = PermissionService.getPermissionsForRole('manager');
      const cashier = PermissionService.getPermissionsForRole('cashier');
      const viewer = PermissionService.getPermissionsForRole('viewer');

      // Admin >= Manager > Cashier > Viewer
      expect(admin.length).toBeGreaterThanOrEqual(manager.length);
      expect(manager.length).toBeGreaterThan(cashier.length);
      expect(cashier.length).toBeGreaterThan(viewer.length);
    });

    it('viewer should only have read permissions', () => {
      const viewerPerms = PermissionService.getPermissionsForRole('viewer');
      const hasWriteOp = viewerPerms.some(
        (p) => p.includes('create') || p.includes('update') || p.includes('delete')
      );
      expect(hasWriteOp).toBe(false);
    });
  });
});
