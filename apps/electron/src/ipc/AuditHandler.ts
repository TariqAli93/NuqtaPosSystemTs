/**
 * AuditHandler.ts
 * IPC handlers for audit log queries and management
 */
import { ipcMain } from 'electron';
import { AuditService, IAuditRepository } from '@nuqtaplus/core';
import { SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { safeSerialize, safeSerializeArray } from '../services/IpcSerializeService.js';

function unwrapAuditPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  if (record.params && typeof record.params === 'object' && !Array.isArray(record.params)) {
    return record.params as Record<string, unknown>;
  }
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }

  return record;
}

export function registerAuditHandlers(db: DatabaseType) {
  const auditRepo: IAuditRepository = new SqliteAuditRepository(db.db);
  const auditService = new AuditService(auditRepo);

  /**
   * Get audit trail for a specific entity
   * Requires: admin or viewer roles
   */
  ipcMain.handle('audit:getTrail', async (_event, payload) => {
    try {
      const { entityType, entityId, limit } = unwrapAuditPayload(payload);

      // Only admin or manager can view audit trails
      requirePermission({ permission: 'audit:read', allowRoles: ['admin', 'manager'] });

      const trail = await auditService.getAuditTrail(
        String(entityType ?? ''),
        Number(entityId),
        Number(limit || 50)
      );
      return ok(safeSerializeArray(trail));
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by user (user's own actions or admin)
   */
  ipcMain.handle('audit:getUserActions', async (_event, payload) => {
    try {
      const { userId, limit, offset } = unwrapAuditPayload(payload);

      // Check permission (users can view their own actions, admins can view all)
      const currentUserId = userContextService.getUserId() || 1;
      if (Number(userId) !== currentUserId) {
        requirePermission({ permission: 'audit:read' }); // admin/manager only for other users
      }

      const events = await auditRepo.getByFilters({
        userId: Number(userId),
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      return ok(safeSerializeArray(events));
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by date range
   * Requires: admin or manager
   */
  ipcMain.handle('audit:getByDateRange', async (_event, payload) => {
    try {
      const { startDate, endDate, limit } = unwrapAuditPayload(payload);

      requirePermission({ permission: 'audit:read' });

      const events = await auditService.getByDateRange(
        String(startDate ?? ''),
        String(endDate ?? ''),
        limit ? Number(limit) : undefined
      );
      return ok(safeSerializeArray(events));
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit events by action
   * Requires: admin or manager
   */
  ipcMain.handle('audit:getByAction', async (_event, payload) => {
    try {
      const { action, limit } = unwrapAuditPayload(payload);

      requirePermission({ permission: 'audit:read' });

      const events = await auditService.getByAction(String(action ?? ''), Number(limit || 100));
      return ok(safeSerializeArray(events));
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Get audit statistics
   * Requires: admin
   */
  ipcMain.handle('audit:getStatistics', async (_event, payload) => {
    try {
      const { startDate, endDate, userId } = unwrapAuditPayload(payload);

      requirePermission({ permission: 'audit:read' });

      const stats = await auditService.getStatistics({
        userId: userId ? Number(userId) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      });
      return ok(stats);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * Cleanup old audit records (admin only)
   * @param olderThanDays Delete records older than N days
   */
  ipcMain.handle('audit:cleanup', async (_event, payload) => {
    try {
      const { olderThanDays } = unwrapAuditPayload(payload);

      requirePermission({ permission: 'audit:cleanup' });

      const deletedCount = await auditService.cleanupOldRecords(Number(olderThanDays));
      return ok({
        deletedCount,
        message: `Deleted ${deletedCount} audit records older than ${Number(olderThanDays)} days`,
      });
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });
}
