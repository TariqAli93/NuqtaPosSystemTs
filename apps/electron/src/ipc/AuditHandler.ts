/**
 * AuditHandler.ts
 * IPC handlers for audit log queries and management
 */
import { ipcMain } from 'electron';
import { AuditService, IAuditRepository } from '@nuqtaplus/core';
import { SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { safeSerialize, safeSerializeArray } from '../services/IpcSerializeService.js';

export function registerAuditHandlers(db: DatabaseType) {
  const auditRepo: IAuditRepository = new SqliteAuditRepository(db.db);
  const auditService = new AuditService(auditRepo);

  /**
   * Get audit trail for a specific entity
   * Requires: admin or viewer roles
   */
  ipcMain.handle('audit:getTrail', async (_event, { entityType, entityId, limit }) => {
    try {
      // Only admin or manager can view audit trails
      requirePermission({ permission: 'audit:read', allowRoles: ['admin', 'manager'] });

      const trail = await auditService.getAuditTrail(entityType, entityId, limit || 50);
      return safeSerializeArray(trail);
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by user (user's own actions or admin)
   */
  ipcMain.handle('audit:getUserActions', async (_event, { userId, limit, offset }) => {
    try {
      // Check permission (users can view their own actions, admins can view all)
      const currentUserId = userContextService.getUserId() || 1;
      if (userId !== currentUserId) {
        requirePermission({ permission: 'audit:read' }); // admin/manager only for other users
      }

      const events = await auditRepo.getByFilters({
        userId,
        limit,
        offset,
      });
      return safeSerializeArray(events);
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by date range
   * Requires: admin or manager
   */
  ipcMain.handle('audit:getByDateRange', async (_event, { startDate, endDate, limit }) => {
    try {
      requirePermission({ permission: 'audit:read' });

      const events = await auditService.getByDateRange(startDate, endDate, limit);
      return safeSerializeArray(events);
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by action
   * Requires: admin or manager
   */
  ipcMain.handle('audit:getByAction', async (_event, { action, limit }) => {
    try {
      requirePermission({ permission: 'audit:read' });

      const events = await auditService.getByAction(action, limit || 100);
      return safeSerializeArray(events);
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit statistics
   * Requires: admin
   */
  ipcMain.handle('audit:getStatistics', async (_event, { startDate, endDate, userId }) => {
    try {
      requirePermission({ permission: 'audit:read' });

      const stats = await auditService.getStatistics({
        userId,
        startDate,
        endDate,
      });
      return stats;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Cleanup old audit records (admin only)
   * @param olderThanDays Delete records older than N days
   */
  ipcMain.handle('audit:cleanup', async (_event, { olderThanDays }) => {
    try {
      requirePermission({ permission: 'audit:admin' });

      const deletedCount = await auditService.cleanupOldRecords(olderThanDays);
      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} audit records older than ${olderThanDays} days`,
      };
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });
}
