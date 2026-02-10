import type { ApiResult, PagedResult } from './contracts';
import type { Product, ProductInput } from '../types/domain';
import { invoke, invokePaged } from './invoke';
import {
  buildDataPayload,
  buildIdPayload,
  buildParamsPayload,
  buildUpdatePayload,
} from './payloads';

export const productsClient = {
  getAll: (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResult<PagedResult<Product>>> =>
    invokePaged<Product>('products:getAll', buildParamsPayload('products:getAll', params)),
  getById: (id: number): Promise<ApiResult<Product | null>> =>
    invoke<Product | null>('products:getById', buildIdPayload('products:getById', id)),
  create: (product: ProductInput): Promise<ApiResult<Product>> =>
    invoke<Product>('products:create', buildDataPayload('products:create', product)),
  update: (id: number, product: ProductInput): Promise<ApiResult<Product>> =>
    invoke<Product>('products:update', buildUpdatePayload('products:update', id, product)),
  delete: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('products:delete', buildIdPayload('products:delete', id)),
  adjustStock: (productId: number, quantityChange: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>(
      'products:adjustStock',
      buildDataPayload('products:adjustStock', { productId, quantityChange })
    ),
};
