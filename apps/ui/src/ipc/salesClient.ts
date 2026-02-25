import type { ApiResult, PagedResult } from './contracts';
import type { Payment, Sale, SaleInput } from '../types/domain';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildIdPayload, buildParamsPayload } from './payloads';

export const salesClient = {
  getAll: (params?: Record<string, unknown>): Promise<ApiResult<PagedResult<Sale>>> =>
    invokePaged<Sale>('sales:getAll', buildParamsPayload('sales:getAll', params)),

  /**
   * Create a sale.
   * Payload shape: { data: CreateSaleInput } (flat DTO, no nested { sale: ... }).
   * userId is NOT sent — resolved by UserContextService in the IPC handler.
   */
  create: (sale: SaleInput): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:create', buildDataPayload('sales:create', sale)),

  /**
   * Add a payment to an existing sale.
   * Payload shape: { data: AddPaymentInput } (flat DTO with saleId, amount, paymentMethod, etc.)
   */
  addPayment: (saleId: number, payment: Omit<Payment, 'saleId'>): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:addPayment', buildDataPayload('sales:addPayment', { saleId, ...payment })),

  getById: (id: number): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:getById', buildIdPayload('sales:getById', id)),
  cancel: (id: number): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:cancel', buildIdPayload('sales:cancel', id)),
  refund: (id: number): Promise<ApiResult<Sale>> =>
    invoke<Sale>('sales:refund', buildIdPayload('sales:refund', id)),
  generateReceipt: (id: number): Promise<ApiResult<{ receiptHtml: string }>> =>
    invoke<{ receiptHtml: string }>(
      'sales:generateReceipt',
      buildIdPayload('sales:generateReceipt', id)
    ),
};
