import { ipcMain } from 'electron';
import { GetDashboardStatsUseCase } from '@nuqtaplus/core';
import { SqliteSaleRepository } from '@nuqtaplus/data';
import { SqliteProductRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { requirePermission } from '../services/PermissionGuardService.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

export function registerDashboardHandlers(db: DatabaseType) {
  const saleRepo = new SqliteSaleRepository(db.db);
  const productRepo = new SqliteProductRepository(db.db);
  const getStatsUseCase = new GetDashboardStatsUseCase(saleRepo, productRepo);

  ipcMain.handle('dashboard:getStats', async () => {
    try {
      // Dashboard access requires at least cashier role
      try {
        requirePermission({
          permission: 'dashboard:read',
          allowRoles: ['admin', 'manager', 'cashier'],
        });
      } catch (permError: any) {
        // If permission check fails, return error response
        return mapErrorToIpcResponse(permError);
      }

      const result = await getStatsUseCase.execute();
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
