import { ipcMain } from 'electron';
import {
  GetProductsUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  AdjustProductStockUseCase,
} from '@nuqtaplus/core';
import { SqliteProductRepository, SqliteAuditRepository } from '@nuqtaplus/data';
import { DatabaseType, withTransaction } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerProductHandlers(db: DatabaseType) {
  const productRepo = new SqliteProductRepository(db.db);
  const auditRepo = new SqliteAuditRepository(db.db);
  const getProductsUseCase = new GetProductsUseCase(productRepo);
  const createProductUseCase = new CreateProductUseCase(productRepo);
  const updateProductUseCase = new UpdateProductUseCase(productRepo);
  const deleteProductUseCase = new DeleteProductUseCase(productRepo);
  const adjustStockUseCase = new AdjustProductStockUseCase(productRepo);

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for products:create
   */
  function validateCreateProductPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate required name
    if (!data.name || typeof data.name !== 'string') {
      throw buildValidationError(channel, payload, 'Product name must be a string');
    }

    // Validate required SKU
    if (!data.sku || typeof data.sku !== 'string') {
      throw buildValidationError(channel, payload, 'SKU must be a string');
    }

    // Validate required category ID
    if (typeof data.categoryId !== 'number') {
      throw buildValidationError(channel, payload, 'Category ID must be a number');
    }

    // Validate required price
    if (typeof data.costPrice !== 'number' || data.costPrice < 0) {
      throw buildValidationError(channel, payload, 'Cost price must be a non-negative number');
    }

    if (typeof data.sellingPrice !== 'number' || data.sellingPrice < 0) {
      throw buildValidationError(channel, payload, 'Selling price must be a non-negative number');
    }

    // Validate required stock
    if (typeof data.stock !== 'number' || data.stock < 0) {
      throw buildValidationError(channel, payload, 'Stock must be a non-negative number');
    }

    // Validate optional description
    if (data.description && typeof data.description !== 'string') {
      throw buildValidationError(channel, payload, 'Description must be a string if provided');
    }
  }

  /**
   * PHASE 9: IPC PAYLOAD VALIDATION
   * Validates request payload for products:update
   */
  function validateUpdateProductPayload(channel: string, payload: any): void {
    const data = payload.data;

    // Validate name if provided
    if (data.name && typeof data.name !== 'string') {
      throw buildValidationError(channel, payload, 'Product name must be a string if provided');
    }

    // Validate SKU if provided
    if (data.sku && typeof data.sku !== 'string') {
      throw buildValidationError(channel, payload, 'SKU must be a string if provided');
    }

    // Validate category ID if provided
    if (
      data.categoryId !== undefined &&
      data.categoryId !== null &&
      typeof data.categoryId !== 'number'
    ) {
      throw buildValidationError(channel, payload, 'Category ID must be a number if provided');
    }

    // Validate price if provided
    if (
      data.costPrice !== undefined &&
      (typeof data.costPrice !== 'number' || data.costPrice < 0)
    ) {
      throw buildValidationError(
        channel,
        payload,
        'Cost price must be a non-negative number if provided'
      );
    }

    if (
      data.sellingPrice !== undefined &&
      (typeof data.sellingPrice !== 'number' || data.sellingPrice < 0)
    ) {
      throw buildValidationError(
        channel,
        payload,
        'Selling price must be a non-negative number if provided'
      );
    }

    // Validate stock if provided
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
      throw buildValidationError(
        channel,
        payload,
        'Stock must be a non-negative number if provided'
      );
    }

    // Validate description if provided
    if (data.description && typeof data.description !== 'string') {
      throw buildValidationError(channel, payload, 'Description must be a string if provided');
    }
  }

  ipcMain.handle('products:getAll', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'products:read' });

      const { params } = assertPayload('products:getAll', payload, ['params']);
      const result = await getProductsUseCase.execute(params || {});

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:getById', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'products:read' });

      const { params } = assertPayload('products:getById', payload, ['params']);
      const result = await getProductsUseCase.execute(params || {});

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operation in a transaction for atomicity
   */
  ipcMain.handle('products:create', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'products:create' });

      const payload = assertPayload('products:create', params, ['data']);
      validateCreateProductPayload('products:create', payload);

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return createProductUseCase.execute(payload.data as any);
      });

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  /**
   * PHASE 9: TRANSACTION INTEGRITY
   * Wraps multi-write operation in a transaction for atomicity
   */
  ipcMain.handle('products:update', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'products:update' });

      const payload = assertPayload('products:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('products:update', payload, 'ID must be a number');
      }
      validateUpdateProductPayload('products:update', payload);

      const userId = userContextService.getUserId() || 1;

      // PHASE 9: Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return updateProductUseCase.execute(payload.id as number, payload.data as any);
      });

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:delete', async (_event, params) => {
    try {
      // Check permission
      requirePermission({ permission: 'products:delete' });

      const payload = assertPayload('products:delete', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('products:delete', payload, 'ID must be a number');
      }

      const userId = userContextService.getUserId() || 1;

      // Execute in transaction
      const result = withTransaction(db.sqlite, () => {
        return deleteProductUseCase.execute(payload.id as number);
      });

      return result;
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  });

  // Stock adjustment handler
  ipcMain.handle('products:adjustStock', async (_event, params) => {
    try {
      requirePermission({ permission: 'products:update' });

      const payload = assertPayload('products:adjustStock', params, ['data']);
      const data = payload.data as any;

      if (typeof data.productId !== 'number') {
        throw buildValidationError('products:adjustStock', data, 'Product ID must be a number');
      }

      if (!Number.isInteger(data.quantityChange)) {
        throw buildValidationError(
          'products:adjustStock',
          data,
          'Quantity change must be an integer'
        );
      }

      return await adjustStockUseCase.execute(data.productId, data.quantityChange);
    } catch (error: any) {
      return mapErrorToIpcResponse(error);
    }
  });
}
