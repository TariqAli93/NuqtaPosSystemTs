import type { ApiResult, PagedResult } from './contracts';
import type { Purchase } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildIdPayload, buildParamsPayload } from './payloads';

export interface PurchaseCreateInput {
  invoiceNumber: string;
  supplierId: number;
  items: {
    productId: number;
    unitName: string;
    unitFactor: number;
    quantity: number;
    unitCost: number;
    discount?: number;
    batchNumber?: string;
    expiryDate?: string;
  }[];
  discount?: number;
  tax?: number;
  paidAmount?: number;
  currency?: string;
  notes?: string;
  idempotencyKey?: string;
}

export const purchasesClient = {
  getAll: (params?: {
    search?: string;
    supplierId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<Purchase>>> =>
    invokePaged<Purchase>('purchases:getAll', buildParamsPayload('purchases:getAll', params)),
  getById: (id: number): Promise<ApiResult<Purchase | null>> =>
    invoke<Purchase | null>('purchases:getById', buildIdPayload('purchases:getById', id)),
  create: (data: PurchaseCreateInput): Promise<ApiResult<Purchase>> =>
    invoke<Purchase>(
      'purchases:create',
      buildDataPayload('purchases:create', data as unknown as Record<string, unknown>)
    ),
};
