/**
 * Cloud Sync Contract Types
 *
 * Defines the interfaces and types for offline-first cloud synchronization.
 * Enables Nuqta Plus to sync local changes to a central cloud database.
 *
 * Architecture:
 * - Device-centric: Each installation registers as a device
 * - Change tracking: Local changes tracked in change_log table
 * - Sync cursor: Tracks last synced change per device
 * - Conflict-free: Last-write-wins resolution strategy
 */

/**
 * Device Registration
 * Represents a single Nuqta Plus installation
 */
export interface Device {
  id: string; // UUID
  name: string; // e.g., "Store A - Register 1"
  type: 'mobile' | 'desktop' | 'tablet'; // Device type
  apiKey: string; // Secret key for authentication (API key-based auth per decision #4)
  version: string; // App version (e.g., "1.0.0")
  platform: string; // OS type (Windows, macOS, Linux, iOS, Android)
  lastSyncAt: number; // Timestamp of last successful sync
  createdAt: number; // Registration timestamp
  status: 'active' | 'inactive' | 'suspended'; // Device status
  metadata?: Record<string, any>; // Custom metadata (location, owner, etc.)
}

/**
 * Sync Cursor
 * Tracks synchronization progress for each device
 */
export interface SyncCursor {
  deviceId: string;
  lastChangeId: number; // ID of last synced change
  lastSyncAt: number; // Timestamp of last sync
  cursor: string; // Opaque cursor for pagination (if needed)
}

/**
 * Change Log Entry
 * Records all changes made locally for sync
 *
 * Strategy:
 * - All changes tracked with device ID and timestamp
 * - Changes sent to server on sync
 * - Server applies with last-write-wins conflict resolution
 * - Server timestamp wins on conflicts (server is source of truth)
 */
export interface ChangeLogEntry {
  id: number; // Auto-increment
  deviceId: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string; // e.g., "Sale", "Product", "Customer"
  entityId: string | number;
  timestamp: number;
  data?: Record<string, any>; // Serialized entity data for create/update
  deletedAt?: number; // For soft deletes
  isSynced: boolean;
}

/**
 * Sync Request
 * Device sends local changes to server
 */
export interface SyncPushRequest {
  deviceId: string;
  apiKey: string;
  changes: ChangeLogEntry[];
  cursorId: number; // Last synced change ID (for resuming)
}

/**
 * Sync Response
 * Server returns remote changes to device
 */
export interface SyncPushResponse {
  success: boolean;
  message?: string;
  syncedCount: number; // Number of changes accepted
  errors?: Array<{
    changeId: number;
    error: string;
    entityId: string | number;
  }>;
  newCursorId: number; // Update client's sync cursor
  serverTimestamp: number;
}

/**
 * Pull Request
 * Device requests remote changes from server
 */
export interface SyncPullRequest {
  deviceId: string;
  apiKey: string;
  fromCursorId?: number; // Start from this change ID (for resuming)
  limit?: number; // Max changes to fetch (default: 1000)
}

/**
 * Pull Response
 * Server sends remote changes to device
 */
export interface SyncPullResponse {
  success: boolean;
  message?: string;
  changes: ChangeLogEntry[];
  hasMore: boolean; // If true, more changes available
  newCursorId: number; // Update client's sync cursor
  serverTimestamp: number;
}

/**
 * Register Device Request
 * New device registration with cloud
 */
export interface DeviceRegisterRequest {
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  version: string;
  platform: string;
  metadata?: Record<string, any>;
}

/**
 * Register Device Response
 * Server provides API key for authenticated sync
 */
export interface DeviceRegisterResponse {
  success: boolean;
  message?: string;
  device: Device;
  apiKey: string; // Secret key for future sync operations
}

/**
 * Sync Status
 * Current synchronization state
 */
export interface SyncStatus {
  lastSyncAt: number | null;
  isSyncing: boolean;
  pendingChanges: number;
  cursorId: number;
  deviceId: string;
  status: 'synced' | 'syncing' | 'pending' | 'error';
  lastError?: string;
}

/**
 * Conflict Resolution Result
 * When conflict detected during sync
 */
export interface ConflictResolution {
  entityType: string;
  entityId: string | number;
  resolution: 'server-wins' | 'client-wins' | 'manual';
  serverValue?: Record<string, any>;
  clientValue?: Record<string, any>;
  resolvedValue?: Record<string, any>;
}

/**
 * Batch Sync Operation
 * For efficient bulk sync
 */
export interface BatchSyncOperation {
  deviceId: string;
  operations: Array<{
    id: string;
    operation: 'create' | 'update' | 'delete';
    entityType: string;
    entityId: string | number;
    data?: Record<string, any>;
  }>;
}

/**
 * Cloud Sync Configuration
 * Client-side settings for sync behavior
 */
export interface CloudSyncConfig {
  enabled: boolean;
  cloudUrl: string; // e.g., "https://sync.nuqtaplus.com"
  syncInterval: number; // Milliseconds between syncs
  autoSync: boolean; // Enable automatic syncing
  conflictResolution: 'server-wins' | 'client-wins' | 'manual';
  retryAttempts: number; // Retry failed sync N times
  retryDelay: number; // Delay between retries in ms
  batchSize: number; // Changes per sync request
  enabledEntities: string[]; // Which entity types to sync (empty = all)
}
