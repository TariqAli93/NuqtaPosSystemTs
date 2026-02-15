import { ipcMain } from 'electron';
import { DatabaseType, SqliteSaleRepository } from '@nuqtaplus/data';
import { ok, mapErrorToResult } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { printReceipt } from './PrinterHandler.js';

export function registerPosHandlers(db: DatabaseType): void {
  const saleRepo = new SqliteSaleRepository(db.db);

  ipcMain.handle(
    'pos:afterPay',
    async (_event, payload: { data?: { saleId?: unknown; printerName?: unknown } }) => {
      try {
        requirePermission({ permission: 'sales:create' });

        const body = assertPayload('pos:afterPay', payload, ['data']);
        const data = body.data as Record<string, unknown>;
        const saleId = Number(data.saleId);

        if (!Number.isFinite(saleId) || saleId <= 0) {
          throw buildValidationError('pos:afterPay', payload, 'saleId must be a positive number');
        }

        const printerName =
          typeof data.printerName === 'string' ? data.printerName.trim() : undefined;

        if (!printerName) {
          return ok({ queued: true, printed: false });
        }

        const receiptHtml = saleRepo.generateReceipt(saleId);
        await printReceipt({
          receiptHtml,
          printerName,
          cut: 'full',
          kickPin: 0,
          feedLines: 5,
        });

        return ok({ queued: true, printed: true });
      } catch (error: unknown) {
        return mapErrorToResult(error);
      }
    }
  );
}
