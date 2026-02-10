import type { ApiResult, PagedResult } from './contracts';
import type { Payment, Sale, SaleInput } from '../types/domain';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildIdPayload, buildParamsPayload } from './payloads';

export const salesClient = {
  getAll: (params?: Record<string, unknown>): Promise<ApiResult<PagedResult<Sale>>> =>
    invokePaged<Sale>('sales:getAll', buildParamsPayload('sales:getAll', params)),
  create: (sale: SaleInput, userId?: number): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:create', buildDataPayload('sales:create', { sale, userId })),
  addPayment: (id: number, payment: Payment): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:addPayment', buildDataPayload('sales:addPayment', { saleId: id, payment })),
  getById: (id: number): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:getById', buildIdPayload('sales:getById', id)),
  cancel: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('sales:cancel', buildIdPayload('sales:cancel', id)),
  refund: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('sales:refund', buildIdPayload('sales:refund', id)),
};
