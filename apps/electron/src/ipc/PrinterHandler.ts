import { ipcMain } from 'electron';
import { requirePermission } from '../services/PermissionGuardService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

/**
 * Register printer-related IPC handlers.
 *
 * Endpoint:
 * - printers:getAll: Get available system printers
 */
export function registerPrinterHandlers(): void {
  ipcMain.handle('printers:getAll', async (event) => {
    try {
      requirePermission({
        permission: 'sales:create',
      });

      return await event.sender.getPrintersAsync();
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });
}
