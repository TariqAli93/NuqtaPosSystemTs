import type { ApiResult, PagedResult } from './contracts';
import type { Product, ProductInput } from '../types/domain';
import type { ProductBatch, ProductUnit } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import {
  buildDataPayload,
  buildIdPayload,
  buildParamsPayload,
  buildUpdatePayload,
} from './payloads';
import type { ProductPurchaseHistoryItem, ProductSalesHistoryItem } from '../types/workspace';

interface ProductUnitInput {
  productId: number;
  unitName: string;
  factorToBase: number;
  barcode?: string | null;
  sellingPrice?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
}

interface ProductBatchInput {
  productId: number;
  batchNumber: string;
  expiryDate?: string | null;
  manufacturingDate?: string | null;
  quantityReceived: number;
  quantityOnHand?: number;
  costPerUnit?: number | null;
  purchaseId?: number | null;
  status?: string;
  notes?: string | null;
}

export const productsClient = {
  getAll: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    categoryId?: number;
    supplierId?: number;
    status?: string;
    lowStockOnly?: boolean;
    expiringSoonOnly?: boolean;
  }): Promise<ApiResult<PagedResult<Product>>> =>
    invokePaged<Product>('products:getAll', buildParamsPayload('products:getAll', params)),
  getById: (id: number): Promise<ApiResult<Product | null>> =>
    invoke<Product | null>('products:getById', buildIdPayload('products:getById', id as number)),
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
  findByBarcode: (barcode: string): Promise<ApiResult<Product | null>> =>
    invoke<Product | null>(
      'products:findByBarcode',
      buildDataPayload('products:findByBarcode', { barcode })
    ),
  getPurchaseHistory: (
    productId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResult<PagedResult<ProductPurchaseHistoryItem>>> =>
    invokePaged<ProductPurchaseHistoryItem>(
      'products:getPurchaseHistory',
      buildParamsPayload('products:getPurchaseHistory', { productId, ...(params || {}) })
    ),
  getSalesHistory: (
    productId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResult<PagedResult<ProductSalesHistoryItem>>> =>
    invokePaged<ProductSalesHistoryItem>(
      'products:getSalesHistory',
      buildParamsPayload('products:getSalesHistory', { productId, ...(params || {}) })
    ),
  getUnits: (productId: number): Promise<ApiResult<ProductUnit[]>> =>
    invoke<ProductUnit[]>(
      'products:getUnits',
      buildParamsPayload('products:getUnits', { productId })
    ),
  createUnit: (data: ProductUnitInput): Promise<ApiResult<ProductUnit>> =>
    invoke<ProductUnit>(
      'products:createUnit',
      buildDataPayload('products:createUnit', data as unknown as Record<string, unknown>)
    ),
  updateUnit: (id: number, data: Partial<ProductUnitInput>): Promise<ApiResult<ProductUnit>> =>
    invoke<ProductUnit>(
      'products:updateUnit',
      buildUpdatePayload('products:updateUnit', id, data as Record<string, unknown>)
    ),
  deleteUnit: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('products:deleteUnit', buildIdPayload('products:deleteUnit', id)),
  setDefaultUnit: (productId: number, unitId: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>(
      'products:setDefaultUnit',
      buildDataPayload('products:setDefaultUnit', { productId, unitId })
    ),
  getBatches: (productId: number): Promise<ApiResult<ProductBatch[]>> =>
    invoke<ProductBatch[]>(
      'products:getBatches',
      buildParamsPayload('products:getBatches', { productId })
    ),
  createBatch: (data: ProductBatchInput): Promise<ApiResult<ProductBatch>> =>
    invoke<ProductBatch>(
      'products:createBatch',
      buildDataPayload('products:createBatch', data as unknown as Record<string, unknown>)
    ),
};
