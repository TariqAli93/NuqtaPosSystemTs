import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload, buildParamsPayload } from './payloads';

export interface AuditEvent {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  userId?: number;
  changedFields?: Record<string, { old: unknown; new: unknown }>;
  changeDescription?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditStatistics {
  totalEvents: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser?: Record<string, number>;
}

export const auditClient = {
  /** Get audit trail for a specific entity */
  getTrail: (
    entityType: string,
    entityId: number,
    limit?: number
  ): Promise<ApiResult<AuditEvent[]>> =>
    invoke<AuditEvent[]>(
      'audit:getTrail',
      buildParamsPayload('audit:getTrail', { entityType, entityId, limit: limit ?? 50 })
    ),

  /** Get audit events by user */
  getUserActions: (
    userId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResult<AuditEvent[]>> =>
    invoke<AuditEvent[]>(
      'audit:getUserActions',
      buildParamsPayload('audit:getUserActions', { userId, ...(params ?? {}) })
    ),

  /** Get audit events by date range */
  getByDateRange: (
    startDate: string,
    endDate: string,
    limit?: number
  ): Promise<ApiResult<AuditEvent[]>> =>
    invoke<AuditEvent[]>(
      'audit:getByDateRange',
      buildParamsPayload('audit:getByDateRange', { startDate, endDate, limit })
    ),

  /** Get audit events by action */
  getByAction: (action: string, limit?: number): Promise<ApiResult<AuditEvent[]>> =>
    invoke<AuditEvent[]>(
      'audit:getByAction',
      buildParamsPayload('audit:getByAction', { action, limit })
    ),

  /** Get audit statistics */
  getStatistics: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: number;
  }): Promise<ApiResult<AuditStatistics>> =>
    invoke<AuditStatistics>(
      'audit:getStatistics',
      buildParamsPayload('audit:getStatistics', params ?? {})
    ),

  /** Cleanup old audit records (admin only) */
  cleanup: (olderThanDays: number): Promise<ApiResult<{ deletedCount: number; message: string }>> =>
    invoke<{ deletedCount: number; message: string }>(
      'audit:cleanup',
      buildDataPayload('audit:cleanup', { olderThanDays })
    ),
};
