import type { ApiResult, PagedResult } from './contracts';
import type { Customer, CustomerInput } from '../types/domain';
import { invoke, invokePaged } from './invoke';
import {
  buildDataPayload,
  buildIdPayload,
  buildParamsPayload,
  buildUpdatePayload,
} from './payloads';

export const customersClient = {
  getAll: (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<Customer>>> =>
    invokePaged<Customer>('customers:getAll', buildParamsPayload('customers:getAll', params)),
  getById: (id: number): Promise<ApiResult<Customer | null>> =>
    invoke<Customer | null>('customers:getById', buildIdPayload('customers:getById', id)),
  create: (customer: CustomerInput): Promise<ApiResult<Customer>> =>
    invoke<Customer>('customers:create', buildDataPayload('customers:create', customer)),
  update: (id: number, customer: CustomerInput): Promise<ApiResult<Customer>> =>
    invoke<Customer>('customers:update', buildUpdatePayload('customers:update', id, customer)),
  delete: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('customers:delete', buildIdPayload('customers:delete', id)),
};
