import { ipcMain } from 'electron';
import { UpdateService } from '../services/UpdateService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

/**
 * Register update-related IPC handlers.
 *
 * Endpoints:
 * - update:checkForUpdates: Manually trigger update check (admin only)
 * - update:getCurrentVersion: Get current app version (admin only)
 * - update:isUpdateAvailable: Check if update ready to install (admin only)
 * - update:downloadUpdate: Trigger update download (admin only)
 * - update:installAndRestart: Install and restart app (admin only)
 */
export function registerUpdateHandlers(updateService: UpdateService): void {
  /**
   * Manually check for updates.
   * Endpoint: update:checkForUpdates
   * Permission: admin only
   *
   * @returns ApiResult<null>
   */
  ipcMain.handle('update:checkForUpdates', async () => {
    try {
      requirePermission({ permission: 'update:check', allowRoles: ['admin'] });

      await updateService.checkForUpdates();
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Get current application version.
   * Endpoint: update:getCurrentVersion
   * Permission: admin only
   *
   * @returns ApiResult<{ version: string }>
   */
  ipcMain.handle('update:getCurrentVersion', () => {
    try {
      requirePermission({ permission: 'update:check', allowRoles: ['admin'] });

      const version = updateService.getCurrentVersion();
      return ok({ version });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Check if update is available and ready to install.
   * Endpoint: update:isUpdateAvailable
   * Permission: admin only
   *
   * @returns ApiResult<{ available: boolean }>
   */
  ipcMain.handle('update:isUpdateAvailable', () => {
    try {
      requirePermission({ permission: 'update:check', allowRoles: ['admin'] });

      const available = updateService.isUpdateAvailable();
      return ok({ available });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Download available update.
   * Endpoint: update:downloadUpdate
   * Permission: admin only
   *
   * @returns ApiResult<null>
   */
  ipcMain.handle('update:downloadUpdate', () => {
    try {
      requirePermission({ permission: 'update:download', allowRoles: ['admin'] });

      updateService.downloadUpdate();
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  /**
   * Install update and restart application.
   * Endpoint: update:installAndRestart
   * WARNING: This will close the app immediately.
   * Permission: admin only
   *
   * @returns ApiResult<null>
   */
  ipcMain.handle('update:installAndRestart', () => {
    try {
      requirePermission({ permission: 'update:install', allowRoles: ['admin'] });

      updateService.installAndRestart();
      return ok(null);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
