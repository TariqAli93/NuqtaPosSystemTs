import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { IAuditRepository } from '@nuqtaplus/core';
import { AuditEvent } from '@nuqtaplus/core';
import { auditLogs } from '../schema/schema.js';

type AuditLogRow = typeof auditLogs.$inferSelect;

export class SqliteAuditRepository implements IAuditRepository {
  constructor(private db: DbClient) {}

  async create(auditEvent: AuditEvent): Promise<AuditEvent> {
    const inserted = await this.db
      .insert(auditLogs)
      .values({
        userId: auditEvent.userId,
        action: auditEvent.action,
        entityType: auditEvent.entityType,
        entityId: auditEvent.entityId,
        timestamp: auditEvent.timestamp,
        changedFields: auditEvent.changedFields ? JSON.stringify(auditEvent.changedFields) : null,
        changeDescription: auditEvent.changeDescription || null,
        ipAddress: auditEvent.ipAddress || null,
        userAgent: auditEvent.userAgent || null,
        metadata: auditEvent.metadata ? JSON.stringify(auditEvent.metadata) : null,
      })
      .returning();

    return this.toDomain(inserted[0]);
  }

  async getByFilters(filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    const conditions = [];

    if (filters.userId !== undefined) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.entityType !== undefined) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId !== undefined) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.action !== undefined) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.timestamp, filters.endDate));
    }

    let query = this.db.select().from(auditLogs).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(auditLogs.timestamp));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const results = await query;
    return results.map((row) => this.toDomain(row));
  }

  async getById(id: number): Promise<AuditEvent | null> {
    const result = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async count(filters: {
    userId?: number;
    entityType?: string;
    entityId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    const conditions = [];

    if (filters.userId !== undefined) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.entityType !== undefined) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId !== undefined) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.action !== undefined) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.timestamp, filters.endDate));
    }

    let query = this.db.select().from(auditLogs).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    return results.length;
  }

  async getAuditTrail(entityType: string, entityId: number, limit?: number): Promise<AuditEvent[]> {
    let query = this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.timestamp))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query;
    return results.map((row) => this.toDomain(row));
  }

  async deleteOlderThan(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffISO = cutoffDate.toISOString();

    const result = await this.db.delete(auditLogs).where(lte(auditLogs.timestamp, cutoffISO));

    return result.changes || 0;
  }

  private toDomain(row: AuditLogRow): AuditEvent {
    return new AuditEvent({
      id: row.id,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      timestamp: row.timestamp,
      changedFields: row.changedFields ? JSON.parse(row.changedFields) : undefined,
      changeDescription: row.changeDescription || undefined,
      ipAddress: row.ipAddress || undefined,
      userAgent: row.userAgent || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    });
  }
}
