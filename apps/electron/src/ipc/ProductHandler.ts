import { ipcMain } from 'electron';
import {
  GetProductsUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  AdjustProductStockUseCase,
} from '@nuqtaplus/core';
import {
  SqliteProductRepository,
  SqliteProductWorkspaceRepository,
  SqliteInventoryRepository,
  SqliteAccountingRepository,
  withTransaction,
  DatabaseType,
} from '@nuqtaplus/data';
import { ok, mapErrorToIpcResponse } from '../services/IpcErrorMapperService.js';
import { requirePermission } from '../services/PermissionGuardService.js';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';
import { userContextService } from '../services/UserContextService.js';

export function registerProductHandlers(db: DatabaseType) {
  const productRepo = new SqliteProductRepository(db.db);
  const productWorkspaceRepo = new SqliteProductWorkspaceRepository(db.db);
  const inventoryRepo = new SqliteInventoryRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);
  const getProductsUseCase = new GetProductsUseCase(productRepo);
  const createProductUseCase = new CreateProductUseCase(productRepo);
  const updateProductUseCase = new UpdateProductUseCase(productRepo);
  const deleteProductUseCase = new DeleteProductUseCase(productRepo);
  const adjustStockUseCase = new AdjustProductStockUseCase(
    productRepo,
    inventoryRepo,
    accountingRepo
  );

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

    // Validate optional SKU
    if (
      data.sku !== undefined &&
      data.sku !== null &&
      typeof data.sku !== 'string'
    ) {
      throw buildValidationError(channel, payload, 'SKU must be a string if provided');
    }

    // Validate optional category ID
    if (
      data.categoryId !== undefined &&
      data.categoryId !== null &&
      typeof data.categoryId !== 'number'
    ) {
      throw buildValidationError(channel, payload, 'Category ID must be a number if provided');
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
      const parsed = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const result = await getProductsUseCase.execute({
        search: typeof parsed.search === 'string' ? parsed.search : undefined,
        page: typeof parsed.page === 'number' ? parsed.page : Number(parsed.page) || 1,
        limit: typeof parsed.limit === 'number' ? parsed.limit : Number(parsed.limit) || 20,
        categoryId:
          typeof parsed.categoryId === 'number'
            ? parsed.categoryId
            : Number.isFinite(Number(parsed.categoryId))
              ? Number(parsed.categoryId)
              : undefined,
        supplierId:
          typeof parsed.supplierId === 'number'
            ? parsed.supplierId
            : Number.isFinite(Number(parsed.supplierId))
              ? Number(parsed.supplierId)
              : undefined,
        status: typeof parsed.status === 'string' ? parsed.status : undefined,
        lowStockOnly: Boolean(parsed.lowStockOnly),
        expiringSoonOnly: Boolean(parsed.expiringSoonOnly),
      });

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:getPurchaseHistory', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:read' });

      const parsed = assertPayload('products:getPurchaseHistory', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object'
          ? (parsed.params as Record<string, unknown>)
          : {};

      const productId = Number(params.productId);
      if (!Number.isFinite(productId)) {
        throw buildValidationError(
          'products:getPurchaseHistory',
          payload,
          'productId must be a number'
        );
      }

      const result = productWorkspaceRepo.findPurchaseHistoryByProduct(productId, {
        limit:
          typeof params.limit === 'number' ? params.limit : Number(params.limit) || 50,
        offset:
          typeof params.offset === 'number' ? params.offset : Number(params.offset) || 0,
      });

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:getSalesHistory', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:read' });

      const parsed = assertPayload('products:getSalesHistory', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object'
          ? (parsed.params as Record<string, unknown>)
          : {};

      const productId = Number(params.productId);
      if (!Number.isFinite(productId)) {
        throw buildValidationError(
          'products:getSalesHistory',
          payload,
          'productId must be a number'
        );
      }

      const result = productWorkspaceRepo.findSalesHistoryByProduct(productId, {
        limit:
          typeof params.limit === 'number' ? params.limit : Number(params.limit) || 50,
        offset:
          typeof params.offset === 'number' ? params.offset : Number(params.offset) || 0,
      });

      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:getUnits', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:read' });
      const parsed = assertPayload('products:getUnits', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object'
          ? (parsed.params as Record<string, unknown>)
          : {};
      const productId = Number(params.productId);
      if (!Number.isFinite(productId)) {
        throw buildValidationError('products:getUnits', payload, 'productId must be a number');
      }
      return ok(productRepo.findUnitsByProductId(productId));
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:createUnit', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:update' });
      const parsed = assertPayload('products:createUnit', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};

      const productId = Number(data.productId);
      if (!Number.isFinite(productId)) {
        throw buildValidationError('products:createUnit', payload, 'productId must be a number');
      }
      if (!data.unitName || typeof data.unitName !== 'string') {
        throw buildValidationError('products:createUnit', payload, 'unitName is required');
      }

      const created = productRepo.createUnit({
        productId,
        unitName: data.unitName,
        factorToBase:
          typeof data.factorToBase === 'number'
            ? data.factorToBase
            : Number(data.factorToBase) || 1,
        barcode: typeof data.barcode === 'string' ? data.barcode : null,
        sellingPrice:
          typeof data.sellingPrice === 'number'
            ? data.sellingPrice
            : data.sellingPrice === null
              ? null
              : undefined,
        isDefault: Boolean(data.isDefault),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      } as any);

      return ok(created);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:updateUnit', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:update' });
      const parsed = assertPayload('products:updateUnit', payload, ['id', 'data']);
      const unitId = Number(parsed.id);
      if (!Number.isFinite(unitId)) {
        throw buildValidationError('products:updateUnit', payload, 'id must be a number');
      }

      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};

      const updated = productRepo.updateUnit(unitId, {
        unitName: typeof data.unitName === 'string' ? data.unitName : undefined,
        factorToBase:
          typeof data.factorToBase === 'number'
            ? data.factorToBase
            : data.factorToBase !== undefined
              ? Number(data.factorToBase)
              : undefined,
        barcode:
          typeof data.barcode === 'string'
            ? data.barcode
            : data.barcode === null
              ? null
              : undefined,
        sellingPrice:
          typeof data.sellingPrice === 'number'
            ? data.sellingPrice
            : data.sellingPrice === null
              ? null
              : undefined,
        isDefault: data.isDefault === undefined ? undefined : Boolean(data.isDefault),
        isActive: data.isActive === undefined ? undefined : Boolean(data.isActive),
      } as any);

      return ok(updated);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:deleteUnit', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:update' });
      const parsed = assertPayload('products:deleteUnit', payload, ['id']);
      const unitId = Number(parsed.id);
      if (!Number.isFinite(unitId)) {
        throw buildValidationError('products:deleteUnit', payload, 'id must be a number');
      }
      productRepo.deleteUnit(unitId);
      return ok({ ok: true });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:setDefaultUnit', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:update' });
      const parsed = assertPayload('products:setDefaultUnit', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};
      const productId = Number(data.productId);
      const unitId = Number(data.unitId);
      if (!Number.isFinite(productId) || !Number.isFinite(unitId)) {
        throw buildValidationError(
          'products:setDefaultUnit',
          payload,
          'productId and unitId must be numbers'
        );
      }
      productRepo.setDefaultUnit(productId, unitId);
      return ok({ ok: true });
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:getBatches', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:read' });
      const parsed = assertPayload('products:getBatches', payload, ['params']);
      const params =
        parsed.params && typeof parsed.params === 'object'
          ? (parsed.params as Record<string, unknown>)
          : {};
      const productId = Number(params.productId);
      if (!Number.isFinite(productId)) {
        throw buildValidationError('products:getBatches', payload, 'productId must be a number');
      }
      return ok(productRepo.findBatchesByProductId(productId));
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:createBatch', async (_event, payload) => {
    try {
      requirePermission({ permission: 'products:update' });
      const parsed = assertPayload('products:createBatch', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};

      const productId = Number(data.productId);
      const quantityReceived =
        typeof data.quantityReceived === 'number'
          ? data.quantityReceived
          : Number(data.quantityReceived);
      const quantityOnHand =
        typeof data.quantityOnHand === 'number'
          ? data.quantityOnHand
          : Number(data.quantityOnHand ?? quantityReceived);

      if (!Number.isFinite(productId)) {
        throw buildValidationError('products:createBatch', payload, 'productId must be a number');
      }
      if (!data.batchNumber || typeof data.batchNumber !== 'string') {
        throw buildValidationError('products:createBatch', payload, 'batchNumber is required');
      }
      if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
        throw buildValidationError(
          'products:createBatch',
          payload,
          'quantityReceived must be a positive number'
        );
      }
      if (!Number.isFinite(quantityOnHand) || quantityOnHand < 0) {
        throw buildValidationError(
          'products:createBatch',
          payload,
          'quantityOnHand must be zero or a positive number'
        );
      }

      const userId = userContextService.getUserId() || 1;
      const created = withTransaction(db.sqlite, () => {
        const product = productRepo.findById(productId);
        if (!product) {
          throw buildValidationError('products:createBatch', payload, 'Product not found');
        }

        const batch = productRepo.createBatch({
          productId,
          batchNumber: data.batchNumber,
          expiryDate: typeof data.expiryDate === 'string' ? data.expiryDate : null,
          manufacturingDate:
            typeof data.manufacturingDate === 'string' ? data.manufacturingDate : null,
          quantityReceived,
          quantityOnHand,
          costPerUnit:
            typeof data.costPerUnit === 'number'
              ? data.costPerUnit
              : data.costPerUnit === null
                ? undefined
                : Number(data.costPerUnit) || undefined,
          purchaseId:
            typeof data.purchaseId === 'number'
              ? data.purchaseId
              : data.purchaseId === null
                ? undefined
                : Number(data.purchaseId) || undefined,
          status: typeof data.status === 'string' ? data.status : 'active',
          notes: typeof data.notes === 'string' ? data.notes : null,
        } as any);

        if (quantityOnHand > 0) {
          const refreshedProduct = productRepo.findById(productId);
          const stockBefore = refreshedProduct?.stock || 0;
          const stockAfter = stockBefore + quantityOnHand;

          productRepo.updateStock(productId, quantityOnHand);

          inventoryRepo.createMovementSync({
            productId,
            batchId: batch.id,
            movementType: 'in',
            reason: 'opening',
            quantityBase: quantityOnHand,
            unitName: product.unit || 'piece',
            unitFactor: 1,
            stockBefore,
            stockAfter,
            costPerUnit:
              typeof data.costPerUnit === 'number'
                ? data.costPerUnit
                : Number(data.costPerUnit) || product.costPrice,
            totalCost:
              (typeof data.costPerUnit === 'number'
                ? data.costPerUnit
                : Number(data.costPerUnit) || product.costPrice) * quantityOnHand,
            sourceType: 'adjustment',
            sourceId: batch.id,
            notes: `Opening batch ${data.batchNumber}`,
            createdBy: userId,
          });
        }

        return batch;
      });

      return ok(created);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });

  ipcMain.handle('products:getById', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'products:read' });

      const { id } = assertPayload('products:getById', payload, ['id']);
      const result = productRepo.findById(id as number);

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:findByBarcode', async (_event, payload) => {
    try {
      // Check permission (read access)
      requirePermission({ permission: 'products:read' });

      const parsed = assertPayload('products:findByBarcode', payload, ['data']);
      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};
      const barcode = typeof data.barcode === 'string' ? data.barcode : undefined;

      if (!barcode || typeof barcode !== 'string') {
        throw buildValidationError('products:findByBarcode', payload, 'Barcode must be a string');
      }

      const result = productRepo.findByBarcode(barcode as string);

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:create', async (_event, params) => {
    try {
      requirePermission({ permission: 'products:create' });

      const payload = assertPayload('products:create', params, ['data']);
      validateCreateProductPayload('products:create', payload);

      const result = await createProductUseCase.execute(payload.data as any);

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:update', async (_event, params) => {
    try {
      requirePermission({ permission: 'products:update' });

      const payload = assertPayload('products:update', params, ['id', 'data']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('products:update', payload, 'ID must be a number');
      }
      validateUpdateProductPayload('products:update', payload);

      const result = await updateProductUseCase.execute(payload.id as number, payload.data as any);

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

  ipcMain.handle('products:delete', async (_event, params) => {
    try {
      requirePermission({ permission: 'products:delete' });

      const payload = assertPayload('products:delete', params, ['id']);
      if (typeof payload.id !== 'number') {
        throw buildValidationError('products:delete', payload, 'ID must be a number');
      }

      await deleteProductUseCase.execute(payload.id as number);

      return ok(null);
    } catch (e: unknown) {
      return mapErrorToIpcResponse(e);
    }
  });

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

      const userId = userContextService.getUserId() || 1;
      const result = withTransaction(db.sqlite, () =>
        adjustStockUseCase.executeCommitPhase(
          {
            productId: data.productId,
            quantityChange: data.quantityChange,
            reason: data.reason,
            notes: data.notes,
            batchId: data.batchId,
            unitName: data.unitName,
            unitFactor: data.unitFactor,
          },
          userId
        )
      );
      return ok(result);
    } catch (error: unknown) {
      return mapErrorToIpcResponse(error);
    }
  });
}
