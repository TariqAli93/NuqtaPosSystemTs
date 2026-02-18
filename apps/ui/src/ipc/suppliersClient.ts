import type { ApiResult, PagedResult } from './contracts';
import type { Supplier } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import {
  buildDataPayload,
  buildIdPayload,
  buildParamsPayload,
  buildUpdatePayload,
} from './payloads';

export type SupplierInput = Pick<
  Supplier,
  'name' | 'phone' | 'phone2' | 'address' | 'city' | 'notes'
>;

export const suppliersClient = {
  getAll: (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<Supplier>>> =>
    invokePaged<Supplier>('suppliers:getAll', buildParamsPayload('suppliers:getAll', params)),
  getById: (id: number): Promise<ApiResult<Supplier | null>> =>
    invoke<Supplier | null>('suppliers:getById', buildIdPayload('suppliers:getById', id)),
  create: (supplier: SupplierInput): Promise<ApiResult<Supplier>> =>
    invoke<Supplier>(
      'suppliers:create',
      buildDataPayload('suppliers:create', supplier as Record<string, unknown>)
    ),
  update: (id: number, supplier: SupplierInput): Promise<ApiResult<Supplier>> =>
    invoke<Supplier>(
      'suppliers:update',
      buildUpdatePayload('suppliers:update', id, supplier as Record<string, unknown>)
    ),
  delete: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('suppliers:delete', buildIdPayload('suppliers:delete', id)),
};
