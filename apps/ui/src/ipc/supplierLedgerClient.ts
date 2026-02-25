import type { ApiResult, PagedResult } from './contracts';
import type { SupplierLedgerEntry } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildParamsPayload } from './payloads';

interface SupplierPaymentInput {
  supplierId: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
  idempotencyKey?: string;
}

export const supplierLedgerClient = {
  getLedger: (
    supplierId: number,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResult<PagedResult<SupplierLedgerEntry>>> =>
    invokePaged<SupplierLedgerEntry>(
      'supplierLedger:getLedger',
      buildParamsPayload('supplierLedger:getLedger', { supplierId, ...params })
    ),
  recordPayment: (data: SupplierPaymentInput): Promise<ApiResult<SupplierLedgerEntry>> =>
    invoke<SupplierLedgerEntry>(
      'supplierLedger:recordPayment',
      buildDataPayload('supplierLedger:recordPayment', data as unknown as Record<string, unknown>)
    ),
  reconcileBalance: (repair = false): Promise<ApiResult<any>> =>
    invoke<any>(
      'supplierLedger:reconcileBalance',
      buildParamsPayload('supplierLedger:reconcileBalance', { repair })
    ),
};
