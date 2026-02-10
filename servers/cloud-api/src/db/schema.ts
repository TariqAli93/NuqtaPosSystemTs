import { sqliteTable, integer, text, integer as integerType } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Sync Metadata Schema for Cloud API
 *
 * Tables:
 * - devices: Registered app installations
 * - sync_cursors: Track sync progress per device
 * - change_log: Server-side record of all client changes
 */

/**
 * Devices Table
 * Stores information about registered Nuqta Plus installations
 */
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // mobile, desktop, tablet
  apiKey: text('api_key').notNull().unique(),
  version: text('version').notNull(),
  platform: text('platform').notNull(), // Windows, macOS, Linux, iOS, Android
  lastSyncAt: integer('last_sync_at'), // Unix timestamp
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`), // Current time in ms
  status: text('status').default('active').notNull(), // active, inactive, suspended
  metadata: text('metadata'), // JSON string
});

/**
 * Sync Cursors Table
 * Tracks synchronization progress for each device
 * Maps device to the last change_log ID it has synced
 */
export const syncCursors = sqliteTable('sync_cursors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  lastChangeId: integer('last_change_id').default(0).notNull(),
  lastSyncAt: integer('last_sync_at')
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  cursor: text('cursor'), // Opaque cursor for pagination
});

/**
 * Change Log Table (Server-side)
 * Records all changes sent by clients for audit and sync
 *
 * Two-phase approach:
 * 1. Client tracks changes locally (client-side change_log)
 * 2. Client sends changes to server (this table)
 * 3. Server applies changes to main DB
 * 4. Client marks as synced
 */
export const changeLog = sqliteTable('change_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  operation: text('operation').notNull(), // create, update, delete
  entityType: text('entity_type').notNull(), // Sale, Product, Customer, etc.
  entityId: text('entity_id').notNull(),
  timestamp: integer('timestamp').notNull(), // Client timestamp (ms since epoch)
  serverTimestamp: integer('server_timestamp')
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  data: text('data'), // Serialized entity data (for create/update)
  deletedAt: integer('deleted_at'), // For soft deletes
  isSynced: integer('is_synced', { mode: 'boolean' }).default(true).notNull(),
  conflictResolved: integer('conflict_resolved', { mode: 'boolean' }).default(false),
  userId: integer('user_id'), // User ID on source device (audit trail)
});

/**
 * Conflict Log Table (for manual resolution)
 * Stores conflicts that couldn't be auto-resolved
 */
export const conflictLog = sqliteTable('conflict_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  changeLogId: integer('change_log_id')
    .notNull()
    .references(() => changeLog.id, { onDelete: 'cascade' }),
  deviceId: text('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  clientValue: text('client_value'), // JSON string
  serverValue: text('server_value'), // JSON string
  resolution: text('resolution').default('pending'), // pending, server-wins, client-wins, merged
  resolvedValue: text('resolved_value'), // JSON string
  resolvedAt: integer('resolved_at'), // Unix timestamp
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
});

/**
 * Type exports for use in services
 */
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type SyncCursor = typeof syncCursors.$inferSelect;
export type NewSyncCursor = typeof syncCursors.$inferInsert;

export type ChangeLogEntry = typeof changeLog.$inferSelect;
export type NewChangeLogEntry = typeof changeLog.$inferInsert;

export type Conflict = typeof conflictLog.$inferSelect;
export type NewConflict = typeof conflictLog.$inferInsert;
