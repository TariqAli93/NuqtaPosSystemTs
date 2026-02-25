import type { ApiResult, PagedResult } from './contracts';
import type { CustomerLedgerEntry } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildParamsPayload } from './payloads';

interface RecordPaymentInput {
  customerId: number;
  amount: number;
  paymentMethod: string;
  notes?: string;
  idempotencyKey?: string;
}

interface LedgerAdjustmentInput {
  customerId: number;
  amount: number;
  notes?: string;
}

export const customerLedgerClient = {
  getLedger: (
    customerId: number,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResult<PagedResult<CustomerLedgerEntry>>> =>
    invokePaged<CustomerLedgerEntry>(
      'customerLedger:getLedger',
      buildParamsPayload('customerLedger:getLedger', { customerId, ...params })
    ),
  recordPayment: (data: RecordPaymentInput): Promise<ApiResult<CustomerLedgerEntry>> =>
    invoke<CustomerLedgerEntry>(
      'customerLedger:recordPayment',
      buildDataPayload('customerLedger:recordPayment', data as unknown as Record<string, unknown>)
    ),
  addAdjustment: (data: LedgerAdjustmentInput): Promise<ApiResult<CustomerLedgerEntry>> =>
    invoke<CustomerLedgerEntry>(
      'customerLedger:addAdjustment',
      buildDataPayload('customerLedger:addAdjustment', data as unknown as Record<string, unknown>)
    ),
  reconcileDebt: (repair = false): Promise<ApiResult<any>> =>
    invoke<any>(
      'customerLedger:reconcileDebt',
      buildParamsPayload('customerLedger:reconcileDebt', { repair })
    ),
};
