import { ipcMain, app } from 'electron';
import { DatabaseType } from '@nuqtaplus/data';
import { BackupService } from '../services/BackupService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

/**
 * Register backup-related IPC handlers.
 *
 * Permission requirements:
 * - backup:create: admin, manager
 * - backup:list: admin, manager
 * - backup:generateToken: admin, manager
 * - backup:restore: admin (only admins can restore)
 * - backup:delete: admin
 * - backup:getStats: admin, manager
 */
export function registerBackupHandlers(db: DatabaseType): void {
  const backupService = new BackupService(db);

  /**
   * Create a new backup of the current database.
   * Endpoint: backup:create
   * Permission: admin, manager
   *
   * @returns ApiResult<{ backupPath: string, backupName: string, timestamp: number }>
   */
  ipcMain.handle('backup:create', async () => {
    try {
      // Check permission
      requirePermission({
        permission: 'backup:create',
        allowRoles: ['admin', 'manager'],
      });

      const result = backupService.createBackup();

      // we most restart the app after restore, so returning the backup path is not a security risk and can be useful for debugging
      app.relaunch(); // Restart the app to release any locks on the database file

      return ok({
        backupPath: result.backupPath,
        backupName: result.backupName,
        timestamp: result.timestamp,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * List all available backups with metadata.
   * Endpoint: backup:list
   * Permission: admin, manager
   *
   * @returns Array of { name, size, createdAt }
   */
  ipcMain.handle('backup:list', async () => {
    try {
      // Check permission
      requirePermission({
        permission: 'backup:list',
        allowRoles: ['admin', 'manager'],
      });

      const backups = backupService.listBackups();

      // Return only necessary fields (hide full path)
      return ok({
        backups: backups.map((b) => ({
          name: b.name,
          size: b.size,
          createdAt: b.createdAt,
        })),
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Generate a confirmation token for restore operation.
   * Token expires after 60 seconds.
   * Endpoint: backup:generateToken
   * Permission: admin, manager
   *
   * @param backupName - Name of the backup to restore
   * @returns { token: string, expiresAt: number }
   */
  ipcMain.handle('backup:generateToken', async (_event, payload) => {
    try {
      // Check permission
      requirePermission({
        permission: 'backup:create',
        allowRoles: ['admin', 'manager'],
      });

      const body = assertPayload('backup:generateToken', payload, ['data']);
      const data = body.data as any;
      if (!data?.backupName || typeof data.backupName !== 'string') {
        throw buildValidationError('backup:generateToken', payload, 'Backup name is required');
      }

      const result = backupService.generateRestoreToken(data.backupName);

      return ok({
        token: result.token,
        expiresAt: result.expiresAt,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Restore database from backup using a confirmation token.
   * This is a destructive operation; only admins can perform it.
   * Endpoint: backup:restore
   * Permission: admin (strict)
   *
   * @param token - Confirmation token from backup:generateToken
   * @returns ApiResult<{ message: string }>
   */
  ipcMain.handle('backup:restore', async (_event, payload) => {
    try {
      // PHASE 9: Use requirePermission instead of ad-hoc role check
      requirePermission({
        permission: 'backup:restore',
        allowRoles: ['admin'],
      });

      const body = assertPayload('backup:restore', payload, ['data']);
      const data = body.data as any;
      if (!data?.token || typeof data.token !== 'string') {
        throw buildValidationError('backup:restore', payload, 'Token is required');
      }

      const result = backupService.restoreFromBackup(data.token);

      // Schedule app relaunch so the IPC response reaches the renderer first
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 500);

      return ok({
        message: result.message,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Delete a specific backup.
   * Endpoint: backup:delete
   * Permission: admin
   *
   * @param backupName - Name of the backup to delete
   * @returns ApiResult<{ message: string }>
   */
  ipcMain.handle('backup:delete', async (_event, payload) => {
    try {
      // Check permission
      requirePermission({
        permission: 'backup:delete',
        allowRoles: ['admin'],
      });

      const body = assertPayload('backup:delete', payload, ['id']);
      if (typeof body.id !== 'string') {
        throw buildValidationError('backup:delete', payload, 'Backup name must be a string');
      }

      const result = backupService.deleteBackup(body.id);

      return ok({
        message: result.message,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Get backup statistics (total count, total size, oldest/newest timestamps).
   * Endpoint: backup:getStats
   * Permission: admin, manager
   *
   * @returns { totalBackups: number, totalSize: number, oldestBackup: number | null, newestBackup: number | null }
   */
  ipcMain.handle('backup:getStats', async () => {
    try {
      // Check permission
      requirePermission({
        permission: 'backup:list',
        allowRoles: ['admin', 'manager'],
      });

      const stats = backupService.getBackupStats();

      return ok({ stats });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
