import crypto from 'crypto';
import { Database } from 'drizzle-orm';
import { devices, syncCursors, changeLog, conflictLog } from '../db/schema.js';
import {
  Device,
  DeviceRegisterRequest,
  DeviceRegisterResponse,
  SyncPushRequest,
  SyncPushResponse,
  SyncPullRequest,
  SyncPullResponse,
  ChangeLogEntry,
  SyncStatus,
} from '../types/sync.js';
import { eq, and, gt, lt } from 'drizzle-orm';

/**
 * SyncService handles cloud synchronization for Nuqta Plus.
 *
 * Responsibilities:
 * - Device registration (API key generation)
 * - Push: Accept changes from clients
 * - Pull: Return pending changes to clients
 * - Conflict detection & resolution
 * - Change tracking & audit trail
 */
export class SyncService {
  constructor(private db: Database) {}

  /**
   * Register a new device with cloud sync.
   * Generates unique API key for authentication.
   *
   * @param request Device registration data
   * @returns Device info + API key
   */
  async registerDevice(request: DeviceRegisterRequest): Promise<DeviceRegisterResponse> {
    try {
      // Generate unique API key
      const apiKey = this.generateApiKey();

      // Generate device UUID
      const deviceId = crypto.randomUUID();

      // Insert device
      const newDevice = await this.db
        .insert(devices)
        .values({
          id: deviceId,
          name: request.name,
          type: request.type,
          apiKey,
          version: request.version,
          platform: request.platform,
          metadata: request.metadata || {},
          status: 'active',
        })
        .returning();

      // Create sync cursor for device
      await this.db.insert(syncCursors).values({
        deviceId,
        lastChangeId: 0,
      });

      return {
        success: true,
        message: `Device registered: ${request.name}`,
        device: newDevice[0] as Device,
        apiKey, // Return API key once for security
      };
    } catch (error: any) {
      throw new Error(`Device registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate device and verify API key.
   *
   * @param deviceId Device ID
   * @param apiKey API key
   * @returns Device if authenticated
   */
  async authenticateDevice(deviceId: string, apiKey: string): Promise<Device | null> {
    try {
      const result = await this.db
        .select()
        .from(devices)
        .where(and(eq(devices.id, deviceId), eq(devices.apiKey, apiKey)))
        .limit(1);

      return result.length > 0 ? (result[0] as Device) : null;
    } catch (error: any) {
      throw new Error(`Device authentication failed: ${error.message}`);
    }
  }

  /**
   * Accept changes from client (push).
   *
   * @param request Push request with changes
   * @returns Response with sync status
   */
  async pushChanges(request: SyncPushRequest): Promise<SyncPushResponse> {
    try {
      // Authenticate device
      const device = await this.authenticateDevice(request.deviceId, request.apiKey);
      if (!device) {
        throw new Error('Authentication failed');
      }

      let syncedCount = 0;
      const errors: Array<{ changeId: number; error: string; entityId: string | number }> = [];

      // Process each change
      for (const change of request.changes) {
        try {
          // Check for conflicts
          const existingChanges = await this.db
            .select()
            .from(changeLog)
            .where(
              and(
                eq(changeLog.entityType, change.entityType),
                eq(changeLog.entityId, change.entityId.toString())
              )
            )
            .orderBy(changeLog.serverTimestamp);

          // Apply change (last-write-wins for now)
          await this.db.insert(changeLog).values({
            deviceId: request.deviceId,
            operation: change.operation,
            entityType: change.entityType,
            entityId: change.entityId.toString(),
            timestamp: change.timestamp,
            data: change.data,
            deletedAt: change.deletedAt,
          });

          syncedCount++;
        } catch (error: any) {
          errors.push({
            changeId: change.id || 0,
            error: error.message,
            entityId: change.entityId,
          });
        }
      }

      // Update sync cursor
      const newCursorId = request.cursorId + syncedCount;
      await this.db
        .update(syncCursors)
        .set({
          lastChangeId: newCursorId,
          lastSyncAt: new Date(),
        })
        .where(eq(syncCursors.deviceId, request.deviceId));

      // Update device last sync time
      await this.db
        .update(devices)
        .set({ lastSyncAt: new Date() })
        .where(eq(devices.id, request.deviceId));

      return {
        success: errors.length === 0,
        message: `Synced ${syncedCount} changes`,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined,
        newCursorId,
        serverTimestamp: Date.now(),
      };
    } catch (error: any) {
      throw new Error(`Push changes failed: ${error.message}`);
    }
  }

  /**
   * Send pending changes to client (pull).
   *
   * @param request Pull request
   * @returns Remote changes for client
   */
  async pullChanges(request: SyncPullRequest): Promise<SyncPullResponse> {
    try {
      // Authenticate device
      const device = await this.authenticateDevice(request.deviceId, request.apiKey);
      if (!device) {
        throw new Error('Authentication failed');
      }

      const limit = request.limit || 1000;
      const fromCursorId = request.fromCursorId || 0;

      // Fetch changes since cursor
      const changes = await this.db
        .select()
        .from(changeLog)
        .where(
          and(
            gt(changeLog.id, fromCursorId)
            // Exclude changes from same device (already has them)
            // or include them if they're from remote devices
            // For now: send all changes to all devices
          )
        )
        .orderBy(changeLog.id)
        .limit(limit + 1); // Fetch one extra to check hasMore

      // Determine if more changes exist
      const hasMore = changes.length > limit;
      const resultsToReturn = changes.slice(0, limit);

      // Calculate new cursor ID
      const newCursorId =
        resultsToReturn.length > 0
          ? (resultsToReturn[resultsToReturn.length - 1].id as number)
          : fromCursorId;

      return {
        success: true,
        message: `Fetched ${resultsToReturn.length} changes`,
        changes: resultsToReturn as ChangeLogEntry[],
        hasMore,
        newCursorId,
        serverTimestamp: Date.now(),
      };
    } catch (error: any) {
      throw new Error(`Pull changes failed: ${error.message}`);
    }
  }

  /**
   * Get current sync status for a device.
   *
   * @param deviceId Device ID
   * @param apiKey API key
   * @returns Current sync status
   */
  async getSyncStatus(deviceId: string, apiKey: string): Promise<SyncStatus> {
    try {
      // Authenticate
      const device = await this.authenticateDevice(deviceId, apiKey);
      if (!device) {
        throw new Error('Authentication failed');
      }

      // Get sync cursor
      const cursor = await this.db
        .select()
        .from(syncCursors)
        .where(eq(syncCursors.deviceId, deviceId))
        .limit(1);

      const syncCursorData = cursor.length > 0 ? cursor[0] : null;

      // Count pending changes
      const pendingChangesResult = await this.db
        .select()
        .from(changeLog)
        .where(gt(changeLog.id, syncCursorData?.lastChangeId || 0));

      return {
        lastSyncAt: device.lastSyncAt ? device.lastSyncAt.getTime() : null,
        isSyncing: false,
        pendingChanges: pendingChangesResult.length,
        cursorId: syncCursorData?.lastChangeId || 0,
        deviceId,
        status: 'synced',
      };
    } catch (error: any) {
      throw new Error(`Get sync status failed: ${error.message}`);
    }
  }

  /**
   * Get sync statistics.
   *
   * @returns Global sync stats
   */
  async getSyncStats() {
    try {
      // Count active devices
      const deviceCount = await this.db.select().from(devices).where(eq(devices.status, 'active'));

      // Count total changes
      const changeCount = await this.db.select().from(changeLog);

      // Count pending conflicts
      const conflictCount = await this.db
        .select()
        .from(conflictLog)
        .where(eq(conflictLog.resolution, 'pending'));

      return {
        activeDevices: deviceCount.length,
        totalChanges: changeCount.length,
        pendingConflicts: conflictCount.length,
        lastUpdateAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Get sync stats failed: ${error.message}`);
    }
  }

  /**
   * Generate unique API key for device.
   * Format: {random-base64}
   */
  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Suspend a device (stop syncing).
   *
   * @param deviceId Device ID
   */
  async suspendDevice(deviceId: string): Promise<void> {
    try {
      await this.db.update(devices).set({ status: 'suspended' }).where(eq(devices.id, deviceId));
    } catch (error: any) {
      throw new Error(`Suspend device failed: ${error.message}`);
    }
  }

  /**
   * Delete device (cleanup).
   *
   * @param deviceId Device ID
   */
  async deleteDevice(deviceId: string): Promise<void> {
    try {
      // Cascade delete handled by foreign keys
      await this.db.delete(devices).where(eq(devices.id, deviceId));
    } catch (error: any) {
      throw new Error(`Delete device failed: ${error.message}`);
    }
  }
}
