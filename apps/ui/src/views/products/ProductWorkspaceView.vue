<template>
  <v-container fluid>
    <v-app-bar class="mb-6" border="bottom">
      <v-app-bar-title>
        <div class="win-title mb-0">مساحة عمل المنتجات</div>
        <div class="text-sm">
          إدارة المنتج في شاشة واحدة: معلومات، حركات، مبيعات، مشتريات، وحدات، دفعات، وتعديل مخزون.
        </div>
      </v-app-bar-title>

      <template #append>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          إضافة منتج
        </v-btn>
      </template>
    </v-app-bar>

    <v-row dense>
      <v-col cols="12" md="4">
        <ProductListPanel
          :products="workspaceStore.products"
          :total="workspaceStore.productsTotal"
          :loading="workspaceStore.loading.products"
          :selected-product-id="workspaceStore.selectedProductId"
          :categories="categories"
          :suppliers="suppliers"
          :filters="workspaceStore.filters"
          @open-create="openCreateDialog"
          @update-filters="onFiltersChange"
          @change-page="onPaginationChange"
          @select-product="selectProduct"
        />
      </v-col>

      <v-col cols="12" md="8">
        <ProductSummaryPanel
          :product="workspaceStore.selectedProduct"
          :loading="workspaceStore.loading.product"
          @edit-product="openEditDialog"
          @delete-product="deleteDialog = true"
          @open-barcode="activeTab = 'units'"
          @open-adjust-stock="openAdjustDrawer"
        />

        <v-card class="mt-4">
          <v-tabs v-model="activeTab" color="primary" density="comfortable" show-arrows>
            <v-tab value="movements">المخزون والحركات</v-tab>
            <v-tab value="purchases">سجل المشتريات</v-tab>
            <v-tab value="sales">سجل المبيعات</v-tab>
            <v-tab value="units">الوحدات والباركود</v-tab>
            <v-tab value="batches">الدفعات والصلاحية</v-tab>
            <v-tab v-if="showAdjustTab" value="adjust">تعديل المخزون</v-tab>
          </v-tabs>
          <v-divider />

          <v-window v-model="activeTab">
            <v-window-item value="movements">
              <v-card-text>
                <ProductMovementsTab
                  v-if="selectedProductId"
                  :product-id="selectedProductId"
                  :movements="workspaceStore.movements"
                  :total="workspaceStore.movementsTotal"
                  :loading="workspaceStore.loading.movements"
                  @reload="workspaceStore.fetchMovements"
                />
              </v-card-text>
            </v-window-item>

            <v-window-item value="purchases">
              <v-card-text>
                <ProductPurchasesTab
                  :items="workspaceStore.purchaseHistory"
                  :total="workspaceStore.purchaseHistoryTotal"
                  :loading="workspaceStore.loading.purchases"
                />
              </v-card-text>
            </v-window-item>

            <v-window-item value="sales">
              <v-card-text>
                <ProductSalesTab
                  :items="workspaceStore.salesHistory"
                  :total="workspaceStore.salesHistoryTotal"
                  :loading="workspaceStore.loading.sales"
                />
              </v-card-text>
            </v-window-item>

            <v-window-item value="units">
              <v-card-text>
                <ProductUnitsBarcodesTab
                  :product="workspaceStore.selectedProduct"
                  :units="workspaceStore.units"
                  :templates="workspaceStore.barcodeTemplates"
                  :print-jobs="workspaceStore.barcodeJobs"
                  :loading="workspaceStore.loading.units || workspaceStore.loading.barcode"
                  @save-unit="onSaveUnit"
                  @delete-unit="onDeleteUnit"
                  @set-default-unit="onSetDefaultUnit"
                  @create-print-job="onCreatePrintJob"
                />
              </v-card-text>
            </v-window-item>

            <v-window-item value="batches">
              <v-card-text>
                <ProductBatchesTab
                  :product="workspaceStore.selectedProduct"
                  :batches="workspaceStore.batches"
                  :loading="workspaceStore.loading.batches"
                  @create-batch="onCreateBatch"
                />
              </v-card-text>
            </v-window-item>

            <v-window-item v-if="showAdjustTab" value="adjust">
              <v-card-text>
                <v-btn color="primary" :disabled="!selectedProductId" @click="openAdjustDrawer">
                  فتح نموذج التعديل
                </v-btn>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>
      </v-col>
    </v-row>

    <StockAdjustDrawer
      v-model="adjustDrawer"
      :product="workspaceStore.selectedProduct"
      :loading="workspaceStore.loading.adjust"
      @submit="onSubmitAdjustment"
    />

    <v-dialog v-model="productDialog" max-width="720" persistent>
      <v-card>
        <v-card-title>{{ editMode ? 'تعديل المنتج' : 'إضافة منتج' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="submitProduct">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field v-model="productForm.name" label="الاسم" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="productForm.sku" label="SKU" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="productForm.barcode" label="الباركود" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="productForm.categoryId"
                  :items="categories"
                  item-title="name"
                  item-value="id"
                  label="الفئة"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.costPrice"
                  label="سعر التكلفة"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.sellingPrice"
                  label="سعر البيع"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="productForm.unit" label="الوحدة" />
              </v-col>
              <!-- <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.stock"
                  label="الرصيد الابتدائي"
                  type="number"
                  min="0"
                />
              </v-col> -->
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="productForm.minStock"
                  label="حد التنبيه"
                  type="number"
                  min="0"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="productForm.supplierId"
                  :items="suppliers"
                  item-title="name"
                  item-value="id"
                  label="المورد"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="productForm.status"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  label="الحالة"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch v-model="productForm.isActive" label="نشط" color="primary" />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch v-model="productForm.isExpire" label="يتتبع الصلاحية" color="primary" />
              </v-col>
              <v-col cols="12" md="8" v-if="productForm.isExpire">
                <v-text-field
                  v-model="productForm.expireDate"
                  label="تاريخ الانتهاء الافتراضي"
                  type="date"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="productForm.description" label="الوصف" rows="2" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="productDialog = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="workspaceStore.loading.save" @click="submitProduct">
            حفظ
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title>حذف المنتج</v-card-title>
        <v-card-text>سيتم حذف المنتج المحدد. هل تريد المتابعة؟</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">إلغاء</v-btn>
          <v-btn color="error" :loading="workspaceStore.loading.save" @click="confirmDelete">
            حذف
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { categoriesClient, suppliersClient } from '@/ipc';
import { useProductWorkspaceStore } from '@/stores/productWorkspaceStore';
import { useAccess } from '@/composables/useAccess';
import { generateIdempotencyKey } from '@/utils/idempotency';
import { notifyError, notifyInfo } from '@/utils/notify';
import { toUserMessage } from '@/utils/errorMessage';
import type { ProductInput } from '@/types/domain';
import type {
  ProductBatchInput,
  ProductUnitInput,
  ProductWorkspaceFilters,
} from '@/types/workspace';
import ProductListPanel from '@/components/workspace/ProductListPanel.vue';
import ProductSummaryPanel from '@/components/workspace/ProductSummaryPanel.vue';
import ProductMovementsTab from '@/components/workspace/ProductMovementsTab.vue';
import ProductPurchasesTab from '@/components/workspace/ProductPurchasesTab.vue';
import ProductSalesTab from '@/components/workspace/ProductSalesTab.vue';
import ProductUnitsBarcodesTab from '@/components/workspace/ProductUnitsBarcodesTab.vue';
import ProductBatchesTab from '@/components/workspace/ProductBatchesTab.vue';
import StockAdjustDrawer from '@/components/workspace/StockAdjustDrawer.vue';

const route = useRoute();
const router = useRouter();
const workspaceStore = useProductWorkspaceStore();
const access = useAccess();

const categories = ref<Array<{ id: number; name: string }>>([]);
const suppliers = ref<Array<{ id: number; name: string }>>([]);

const activeTab = ref<string>((route.query.tab as string) || 'movements');
const adjustDrawer = ref(false);
const productDialog = ref(false);
const editMode = ref(false);
const deleteDialog = ref(false);

const selectedProductId = computed(() => workspaceStore.selectedProductId);
const showAdjustTab = computed(() => access.canAdjustStock.value);
let barcodePollingTimer: ReturnType<typeof setInterval> | null = null;

function stopBarcodePolling(): void {
  if (barcodePollingTimer) {
    clearInterval(barcodePollingTimer);
    barcodePollingTimer = null;
  }
}

function startBarcodePolling(productId: number): void {
  stopBarcodePolling();
  barcodePollingTimer = setInterval(() => {
    void workspaceStore.fetchBarcodeContext(productId);
  }, 2500);
}

const statusOptions = [
  { title: 'متوفر', value: 'available' },
  { title: 'نفاد', value: 'out_of_stock' },
  { title: 'موقوف', value: 'discontinued' },
];

const productForm = reactive<ProductInput>({
  name: '',
  sku: null,
  barcode: null,
  categoryId: null,
  description: null,
  costPrice: 0,
  sellingPrice: 0,
  stock: 0,
  minStock: 0,
  unit: 'piece',
  supplier: null,
  supplierId: null,
  status: 'available',
  isActive: true,
  isExpire: false,
  expireDate: null,
});

watch(activeTab, (tab) => {
  router.replace({
    query: {
      ...route.query,
      tab,
    },
  });
});

watch(
  () => route.query.tab,
  (value) => {
    if (typeof value === 'string' && value !== activeTab.value) {
      activeTab.value = value;
    }
  }
);

watch(
  () => route.query.productId,
  async (value) => {
    const queryId = Number(value);
    if (Number.isFinite(queryId) && queryId > 0 && queryId !== workspaceStore.selectedProductId) {
      await selectProduct(queryId);
    }
  }
);

watch(
  [activeTab, selectedProductId],
  ([tab, productId]) => {
    if (!productId && ['movements', 'units', 'batches', 'adjust'].includes(tab)) {
      notifyInfo('اختر منتجاً أولاً', { dedupeKey: `workspace-need-product-${tab}` });
    }
    if (tab === 'adjust') {
      notifyInfo('تعديل المخزون يسجل حركة في دفتر inventory_movements ويحدّث المخزون المخزن.', {
        dedupeKey: 'workspace-adjust-info',
      });
    }
    if (tab === 'units' && typeof productId === 'number') {
      startBarcodePolling(productId);
      return;
    }
    stopBarcodePolling();
  },
  { immediate: true }
);

watch(
  () => workspaceStore.error,
  (value) => {
    if (!value) return;
    notifyError(toUserMessage(value), { dedupeKey: 'workspace-error' });
  }
);

onMounted(async () => {
  await Promise.all([loadLookups(), workspaceStore.fetchProducts({ limit: 25, offset: 0 })]);
  await applyRouteSelection();
});

onUnmounted(() => {
  stopBarcodePolling();
});

async function loadLookups(): Promise<void> {
  const [categoryResult, supplierResult] = await Promise.all([
    categoriesClient.getAll({ limit: 500, offset: 0 }),
    suppliersClient.getAll({ limit: 500, offset: 0 }),
  ]);

  if (categoryResult.ok) {
    categories.value = categoryResult.data
      .filter((item) => typeof item.id === 'number')
      .map((item) => ({
        id: item.id as number,
        name: item.name,
      }));
  }
  if (supplierResult.ok) {
    suppliers.value = supplierResult.data.items.map((item) => ({
      id: item.id!,
      name: item.name,
    }));
  }
}

async function applyRouteSelection(): Promise<void> {
  const queryProductId = Number(route.query.productId);
  const defaultProductId = workspaceStore.products[0]?.id;
  const targetProductId =
    Number.isFinite(queryProductId) && queryProductId > 0 ? queryProductId : defaultProductId;

  if (targetProductId) {
    await selectProduct(targetProductId);
  }

  const action = route.query.action as string | undefined;
  if (action === 'create') {
    openCreateDialog();
  } else if (action === 'edit' && workspaceStore.selectedProduct) {
    openEditDialog();
  } else if (action === 'barcode') {
    activeTab.value = 'units';
  }
}

async function selectProduct(productId: number): Promise<void> {
  await workspaceStore.loadProductWorkspace(productId);
  await router.replace({
    query: {
      ...route.query,
      productId: String(productId),
      action: undefined,
    },
  });
}

async function onFiltersChange(filters: ProductWorkspaceFilters): Promise<void> {
  const result = await workspaceStore.fetchProducts({
    ...workspaceStore.filters,

    ...filters,
    offset: 0,
  });

  console.log('fetchProducts result', result);
}

async function onPaginationChange(pagination: { limit: number; offset: number }): Promise<void> {
  await workspaceStore.fetchProducts({
    ...workspaceStore.filters,
    limit: pagination.limit,
    offset: pagination.offset,
  });
}

function resetProductForm(): void {
  productForm.name = '';
  productForm.sku = null;
  productForm.barcode = null;
  productForm.categoryId = null;
  productForm.description = null;
  productForm.costPrice = 0;
  productForm.sellingPrice = 0;
  productForm.stock = 0;
  productForm.minStock = 0;
  productForm.unit = 'piece';
  productForm.supplier = null;
  productForm.supplierId = null;
  productForm.status = 'available';
  productForm.isActive = true;
  productForm.isExpire = false;
  productForm.expireDate = null;
}

function openCreateDialog(): void {
  editMode.value = false;
  resetProductForm();
  productDialog.value = true;
}

function openEditDialog(): void {
  if (!workspaceStore.selectedProduct) return;
  const source = workspaceStore.selectedProduct;
  editMode.value = true;
  productForm.name = source.name;
  productForm.sku = source.sku ?? null;
  productForm.barcode = source.barcode ?? null;
  productForm.categoryId = source.categoryId ?? null;
  productForm.description = source.description ?? null;
  productForm.costPrice = source.costPrice;
  productForm.sellingPrice = source.sellingPrice;
  productForm.stock = 0;
  productForm.minStock = source.minStock || 0;
  productForm.unit = source.unit || 'piece';
  productForm.supplier = source.supplier ?? null;
  productForm.supplierId = source.supplierId ?? null;
  productForm.status = source.status;
  productForm.isActive = Boolean(source.isActive);
  productForm.isExpire = Boolean(source.isExpire);
  productForm.expireDate = source.expireDate ?? null;
  productDialog.value = true;
}

async function submitProduct(): Promise<void> {
  const selectedSupplier = suppliers.value.find((item) => item.id === productForm.supplierId);
  const payload: ProductInput = {
    ...productForm,
    supplier: selectedSupplier?.name || null,
  };

  if (editMode.value && workspaceStore.selectedProductId) {
    const result = await workspaceStore.updateProduct(workspaceStore.selectedProductId, payload);
    if (result.ok) {
      productDialog.value = false;
    }
    return;
  }

  const result = await workspaceStore.createProduct(payload);
  if (result.ok) {
    productDialog.value = false;
    if (result.data.id) {
      await selectProduct(result.data.id);
    }
  }
}

async function confirmDelete(): Promise<void> {
  if (!workspaceStore.selectedProductId) return;
  const removedId = workspaceStore.selectedProductId;
  const result = await workspaceStore.deleteProduct(removedId);
  if (result.ok) {
    deleteDialog.value = false;
    const nextProduct = workspaceStore.products.find((item) => item.id !== removedId);
    if (nextProduct?.id) {
      await selectProduct(nextProduct.id);
    }
  }
}

function openAdjustDrawer(): void {
  if (!workspaceStore.selectedProductId) return;
  adjustDrawer.value = true;
}

async function onSubmitAdjustment(payload: {
  productId: number;
  quantityBase: number;
  reason: 'manual' | 'damage' | 'opening';
  unitName?: string;
  notes?: string;
}): Promise<void> {
  const result = await workspaceStore.adjustStock({
    ...payload,
    idempotencyKey: generateIdempotencyKey('workspace-adjust'),
  });
  if (result.ok) {
    adjustDrawer.value = false;
    activeTab.value = 'movements';
  }
}

async function onSaveUnit(payload: { unitId?: number; input: ProductUnitInput }): Promise<void> {
  if (!workspaceStore.selectedProductId) return;
  await workspaceStore.upsertUnit(workspaceStore.selectedProductId, payload.input, payload.unitId);
}

async function onDeleteUnit(unitId: number): Promise<void> {
  if (!workspaceStore.selectedProductId) return;
  await workspaceStore.deleteUnit(workspaceStore.selectedProductId, unitId);
}

async function onSetDefaultUnit(unitId: number): Promise<void> {
  if (!workspaceStore.selectedProductId) return;
  await workspaceStore.setDefaultUnit(workspaceStore.selectedProductId, unitId);
}

async function onCreateBatch(payload: ProductBatchInput): Promise<void> {
  if (!workspaceStore.selectedProductId) return;
  await workspaceStore.createBatch(workspaceStore.selectedProductId, payload);
}

async function onCreatePrintJob(payload: { templateId: number; quantity: number }): Promise<void> {
  const product = workspaceStore.selectedProduct;
  if (!product?.id) return;
  await workspaceStore.createBarcodePrintJob({
    templateId: payload.templateId,
    productId: product.id,
    productName: product.name,
    barcode: product.barcode ?? undefined,
    price: product.sellingPrice,
    expiryDate: product.expireDate ?? undefined,
    quantity: payload.quantity,
  });
}
</script>
