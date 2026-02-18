import { ipcMain } from 'electron';
import { DatabaseType, SqliteBarcodeRepository } from '@nuqtaplus/data';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';

export function registerBarcodeHandlers(db: DatabaseType) {
  const repo = new SqliteBarcodeRepository(db.db);

  ipcMain.handle('barcode:getTemplates', async () => {
    try {
      const templates = await repo.findAllTemplates();
      return ok(templates);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('barcode:createTemplate', async (_, payload) => {
    try {
      const data = assertPayload('barcode:createTemplate', payload, ['data']);
      if (!data.data || typeof data.data !== 'object' || Array.isArray(data.data)) {
        throw buildValidationError('barcode:createTemplate', payload, 'data must be an object');
      }
      const template = await repo.createTemplate(data.data as any);
      return ok(template);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('barcode:getPrintJobs', async (_, payload) => {
    try {
      const params = assertPayload('barcode:getPrintJobs', payload, ['params']);
      if (!params.params || typeof params.params !== 'object' || Array.isArray(params.params)) {
        throw buildValidationError('barcode:getPrintJobs', payload, 'params must be an object');
      }
      const result = await repo.findPrintJobs(params.params as any);
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('barcode:createPrintJob', async (_, payload) => {
    try {
      const data = assertPayload('barcode:createPrintJob', payload, ['data']);
      if (!data.data || typeof data.data !== 'object' || Array.isArray(data.data)) {
        throw buildValidationError('barcode:createPrintJob', payload, 'data must be an object');
      }
      const job = await repo.createPrintJob(data.data as any);
      return ok(job);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('barcode:deleteTemplate', async (_, payload) => {
    try {
      const { id } = assertPayload('barcode:deleteTemplate', payload, ['id']);
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) {
        throw buildValidationError('barcode:deleteTemplate', payload, 'id must be a number');
      }
      await repo.deleteTemplate(numericId);
      return ok({ ok: true });
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });
}
