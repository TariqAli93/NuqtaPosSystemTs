import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { barcodeClient, inventoryClient, productsClient } from '../ipc';
import type {
  BarcodePrintJob,
  BarcodeTemplate,
  InventoryMovement,
  Product,
  ProductBatch,
  ProductUnit,
} from '@nuqtaplus/core';
import type { ProductInput } from '../types/domain';
import type { PrintJobInput } from '../ipc/barcodeClient';
import type {
  ProductBatchInput,
  ProductMovementFilters,
  ProductPurchaseHistoryItem,
  ProductSalesHistoryItem,
  ProductUnitInput,
  ProductWorkspaceFilters,
} from '../types/workspace';

interface LoadingState {
  products: boolean;
  product: boolean;
  movements: boolean;
  purchases: boolean;
  sales: boolean;
  units: boolean;
  batches: boolean;
  barcode: boolean;
  save: boolean;
  adjust: boolean;
}

const initialLoading = (): LoadingState => ({
  products: false,
  product: false,
  movements: false,
  purchases: false,
  sales: false,
  units: false,
  batches: false,
  barcode: false,
  save: false,
  adjust: false,
});

export const useProductWorkspaceStore = defineStore('productWorkspace', () => {
  const products = ref<Product[]>([]);
  const productsTotal = ref(0);
  const selectedProductId = ref<number | null>(null);
  const selectedProduct = ref<Product | null>(null);

  const movements = ref<InventoryMovement[]>([]);
  const movementsTotal = ref(0);

  const purchaseHistory = ref<ProductPurchaseHistoryItem[]>([]);
  const purchaseHistoryTotal = ref(0);

  const salesHistory = ref<ProductSalesHistoryItem[]>([]);
  const salesHistoryTotal = ref(0);

  const units = ref<ProductUnit[]>([]);
  const batches = ref<ProductBatch[]>([]);
  const barcodeTemplates = ref<BarcodeTemplate[]>([]);
  const barcodeJobs = ref<BarcodePrintJob[]>([]);
  const barcodeJobsTotal = ref(0);

  const filters = ref<ProductWorkspaceFilters>({
    search: '',
    limit: 50,
    offset: 0,
  });

  const loading = reactive<LoadingState>(initialLoading());
  const error = ref<string | null>(null);

  const isBusy = computed(() => Object.values(loading).some(Boolean));

  function resetError(): void {
    error.value = null;
  }

  function setError(message: string | undefined): void {
    error.value = message || 'Unknown workspace error';
  }

  async function fetchProducts(next?: ProductWorkspaceFilters) {
    loading.products = true;
    resetError();

    filters.value = { ...filters.value, ...(next || {}) };
    const limit = filters.value.limit || 50;
    const offset = filters.value.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const result = await productsClient.getAll({
      search: filters.value.search,
      page,
      limit,
      categoryId: filters.value.categoryId,
      supplierId: filters.value.supplierId,
      status: filters.value.status,
      lowStockOnly: filters.value.lowStockOnly,
      expiringSoonOnly: filters.value.expiringSoonOnly,
    });

    if (result.ok) {
      products.value = result.data.items;
      productsTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.products = false;
    return result;
  }

  async function fetchProductById(productId: number) {
    loading.product = true;
    resetError();

    const result = await productsClient.getById(productId);
    if (result.ok) {
      selectedProductId.value = productId;
      selectedProduct.value = result.data;
    } else {
      setError(result.error.message);
    }

    loading.product = false;
    return result;
  }

  async function fetchMovements(params: ProductMovementFilters) {
    loading.movements = true;
    resetError();

    const result = await inventoryClient.getMovements(params);
    if (result.ok) {
      movements.value = result.data.items;
      movementsTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.movements = false;
    return result;
  }

  async function fetchPurchaseHistory(productId: number, limit = 50, offset = 0) {
    loading.purchases = true;
    resetError();

    const result = await productsClient.getPurchaseHistory(productId, { limit, offset });
    if (result.ok) {
      purchaseHistory.value = result.data.items;
      purchaseHistoryTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.purchases = false;
    return result;
  }

  async function fetchSalesHistory(productId: number, limit = 50, offset = 0) {
    loading.sales = true;
    resetError();

    const result = await productsClient.getSalesHistory(productId, { limit, offset });
    if (result.ok) {
      salesHistory.value = result.data.items;
      salesHistoryTotal.value = result.data.total;
    } else {
      setError(result.error.message);
    }

    loading.sales = false;
    return result;
  }

  async function fetchUnits(productId: number) {
    loading.units = true;
    resetError();

    const result = await productsClient.getUnits(productId);
    if (result.ok) {
      units.value = result.data;
    } else {
      setError(result.error.message);
    }

    loading.units = false;
    return result;
  }

  async function upsertUnit(productId: number, input: ProductUnitInput, unitId?: number) {
    loading.units = true;
    resetError();

    const result = unitId
      ? await productsClient.updateUnit(unitId, input)
      : await productsClient.createUnit({ ...input, productId });

    if (result.ok) {
      await fetchUnits(productId);
    } else {
      setError(result.error.message);
    }

    loading.units = false;
    return result;
  }

  async function setDefaultUnit(productId: number, unitId: number) {
    loading.units = true;
    resetError();
    const result = await productsClient.setDefaultUnit(productId, unitId);
    if (result.ok) {
      await fetchUnits(productId);
    } else {
      setError(result.error.message);
    }
    loading.units = false;
    return result;
  }

  async function deleteUnit(productId: number, unitId: number) {
    loading.units = true;
    resetError();
    const result = await productsClient.deleteUnit(unitId);
    if (result.ok) {
      await fetchUnits(productId);
    } else {
      setError(result.error.message);
    }
    loading.units = false;
    return result;
  }

  async function fetchBatches(productId: number) {
    loading.batches = true;
    resetError();

    const result = await productsClient.getBatches(productId);
    if (result.ok) {
      batches.value = result.data;
    } else {
      setError(result.error.message);
    }

    loading.batches = false;
    return result;
  }

  async function createBatch(productId: number, input: ProductBatchInput) {
    loading.batches = true;
    resetError();

    const result = await productsClient.createBatch({ ...input, productId });
    if (result.ok) {
      await Promise.all([fetchBatches(productId), fetchProductById(productId)]);
      await fetchMovements({ productId, limit: 50, offset: 0 });
    } else {
      setError(result.error.message);
    }

    loading.batches = false;
    return result;
  }

  async function fetchBarcodeContext(productId: number) {
    loading.barcode = true;
    resetError();

    const [templatesResult, jobsResult] = await Promise.all([
      barcodeClient.getTemplates(),
      barcodeClient.getPrintJobs({ productId, limit: 25, offset: 0 }),
    ]);

    if (templatesResult.ok) {
      barcodeTemplates.value = templatesResult.data;
    } else {
      setError(templatesResult.error.message);
    }

    if (jobsResult.ok) {
      barcodeJobs.value = jobsResult.data.items;
      barcodeJobsTotal.value = jobsResult.data.total;
    } else {
      setError(jobsResult.error.message);
    }

    loading.barcode = false;
    return { templatesResult, jobsResult };
  }

  async function createBarcodePrintJob(input: PrintJobInput) {
    loading.barcode = true;
    resetError();
    const result = await barcodeClient.createPrintJob(input);
    if (result.ok) {
      await fetchBarcodeContext(input.productId);
    } else {
      setError(result.error.message);
    }
    loading.barcode = false;
    return result;
  }

  async function createProduct(payload: ProductInput) {
    loading.save = true;
    resetError();
    const result = await productsClient.create(payload);
    if (result.ok) {
      await fetchProducts();
    } else {
      setError(result.error.message);
    }
    loading.save = false;
    return result;
  }

  async function updateProduct(productId: number, payload: ProductInput) {
    loading.save = true;
    resetError();
    const result = await productsClient.update(productId, payload);
    if (result.ok) {
      await Promise.all([fetchProducts(), fetchProductById(productId)]);
    } else {
      setError(result.error.message);
    }
    loading.save = false;
    return result;
  }

  async function deleteProduct(productId: number) {
    loading.save = true;
    resetError();
    const result = await productsClient.delete(productId);
    if (result.ok) {
      if (selectedProductId.value === productId) {
        selectedProductId.value = null;
        selectedProduct.value = null;
      }
      await fetchProducts();
    } else {
      setError(result.error.message);
    }
    loading.save = false;
    return result;
  }

  async function adjustStock(payload: {
    productId: number;
    quantityBase: number;
    reason: 'manual' | 'damage' | 'opening';
    notes?: string;
    unitName?: string;
    unitFactor?: number;
    batchId?: number;
    idempotencyKey?: string;
  }) {
    loading.adjust = true;
    resetError();

    const result = await inventoryClient.adjustStock(payload);
    if (result.ok) {
      await Promise.all([
        fetchProductById(payload.productId),
        fetchMovements({ productId: payload.productId, limit: 50, offset: 0 }),
        fetchBatches(payload.productId),
      ]);
    } else {
      setError(result.error.message);
    }

    loading.adjust = false;
    return result;
  }

  async function loadProductWorkspace(productId: number) {
    await fetchProductById(productId);
    await Promise.all([
      fetchMovements({ productId, limit: 50, offset: 0 }),
      fetchPurchaseHistory(productId, 50, 0),
      fetchSalesHistory(productId, 50, 0),
      fetchUnits(productId),
      fetchBatches(productId),
      fetchBarcodeContext(productId),
    ]);
  }

  return {
    products,
    productsTotal,
    selectedProductId,
    selectedProduct,
    filters,
    movements,
    movementsTotal,
    purchaseHistory,
    purchaseHistoryTotal,
    salesHistory,
    salesHistoryTotal,
    units,
    batches,
    barcodeTemplates,
    barcodeJobs,
    barcodeJobsTotal,
    loading,
    isBusy,
    error,
    fetchProducts,
    fetchProductById,
    fetchMovements,
    fetchPurchaseHistory,
    fetchSalesHistory,
    fetchUnits,
    upsertUnit,
    setDefaultUnit,
    deleteUnit,
    fetchBatches,
    createBatch,
    fetchBarcodeContext,
    createBarcodePrintJob,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    loadProductWorkspace,
  };
});

