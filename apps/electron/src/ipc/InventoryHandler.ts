import { ipcMain } from 'electron';
import {
  GetInventoryMovementsUseCase,
  GetInventoryDashboardUseCase,
  GetExpiryAlertsUseCase,
  ReconcileStockUseCase,
} from '@nuqtaplus/core';
import {
  SqliteInventoryRepository,
  SqliteProductRepository,
  DatabaseType,
} from '@nuqtaplus/data';
import { assertPayload } from '../services/IpcPayloadValidator.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

export function registerInventoryHandlers(db: DatabaseType) {
  const repository = new SqliteInventoryRepository(db.db);
  const productRepo = new SqliteProductRepository(db.db);
  const getMovementsUseCase = new GetInventoryMovementsUseCase(repository);
  const getDashboardUseCase = new GetInventoryDashboardUseCase(repository);
  const getExpiryAlertsUseCase = new GetExpiryAlertsUseCase(repository);
  const reconcileStockUseCase = new ReconcileStockUseCase(productRepo, repository);

  ipcMain.handle('inventory:getMovements', async (_, payload) => {
    try {
      const parsed = assertPayload('inventory:getMovements', payload, ['params']);
      const result = await getMovementsUseCase.execute((parsed.params || {}) as any);
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('inventory:getDashboardStats', async () => {
    try {
      const result = await getDashboardUseCase.execute();
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('inventory:getExpiryAlerts', async (_, payload) => {
    try {
      assertPayload('inventory:getExpiryAlerts', payload, ['params']);
      const result = await getExpiryAlertsUseCase.execute();
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('inventory:reconcileStock', async (_, payload) => {
    try {
      const parsed = assertPayload('inventory:reconcileStock', payload, ['params']);
      const repair = Boolean((parsed.params as any)?.repair);
      const reconciliation = await reconcileStockUseCase.execute();
      let repairedCount = 0;
      if (repair) {
        repairedCount = await reconcileStockUseCase.repair();
      }
      return ok({
        ...reconciliation,
        repairedCount,
      });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
