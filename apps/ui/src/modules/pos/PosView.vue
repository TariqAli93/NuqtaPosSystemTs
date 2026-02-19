<template>
  <v-container fluid>
    <CartPanel
      :items="cartItems"
      :units-map="cartItemUnitsMap"
      @increase="increaseQuantity"
      @decrease="decreaseQuantity"
      @remove="removeFromCart"
      @unit-change="handleUnitChange"
    >
      <template #totals>
        <TotalsPanel :subtotal="subtotal" :discount="discount" :tax="tax" :total="total" />
      </template>

      <template #actions>
        <PosActionBar
          :can-pay="cartItems.length > 0"
          :can-clear="cartItems.length > 0"
          @pay="handlePay"
          @hold="handleHold"
          @discount="openDiscountDialog"
          @customer="openCustomerDialog"
          @clear="openClearConfirmDialog"
          @note="openNoteDialog"
          @more="openMoreDialog"
        />
      </template>
    </CartPanel>

    <v-app-bar class="mb-5 border-r-0! border-l-0!">
      <v-card-text class="pa-4">
        <v-text-field
          ref="searchField"
          v-model="searchQuery"
          variant="outlined"
          hide-details
          single-line
          density="comfortable"
          clearable
          :placeholder="t('pos.searchPlaceholder')"
          prepend-inner-icon="mdi-barcode-scan"
          @update:model-value="handleSearch"
          @keydown.enter.prevent="handleSearchSubmit"
          @click:clear="clearSearch"
          :autofocus="false"
        />
      </v-card-text>
    </v-app-bar>

    <CategoryStrip
      :categories="categories"
      :selected-id="selectedCategory"
      @select="selectCategory"
      class="mb-5"
    />

    <v-row>
      <template v-if="productsStore.loading">
        <v-col v-for="n in 12" :key="`skeleton-${n}`" cols="6" sm="4" md="3" lg="2" xl="2">
          <v-skeleton-loader type="card" />
        </v-col>
      </template>

      <template v-else-if="filteredProducts.length > 0">
        <v-col
          v-for="product in filteredProducts"
          :key="product.id"
          cols="12"
          xs="12"
          sm="12"
          md="6"
          lg="2"
          xl="2"
          xxl="2"
        >
          <ProductTile :product="product" @select="addToCart" />
        </v-col>
      </template>
    </v-row>

    <v-sheet
      v-if="filteredProducts.length === 0 && !productsStore.loading"
      color="transparent"
      rounded="0"
      min-height="300"
      class="d-flex flex-column align-center justify-center"
    >
      <v-icon size="56" color="grey-lighten-2">mdi-package-variant-closed</v-icon>
      <div class="text-subtitle-1 text-medium-emphasis mt-4">{{ t('pos.noProducts') }}</div>
      <div class="text-body-2 text-medium-emphasis mt-2 text-center">
        {{ t('pos.noProductsHint') }}
      </div>
    </v-sheet>
  </v-container>

  <PaymentOverlay
    v-model="payOpen"
    :total="total"
    :subtotal="subtotal"
    :discount="discount"
    :tax="tax"
    :currency="currency"
    :cashier-name="cashierName"
    :cashier-title="'POS Client'"
    :busy="isProcessingPayment"
    :has-customer="selectedCustomerId !== null"
    :simple-mode="featureFlagsStore.simpleMode"
    @confirmed="handlePaymentConfirm"
  />

  <v-dialog v-model="showClearConfirm" max-width="420" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.clearCartTitle') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">{{ t('pos.clearCartText') }}</v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="showClearConfirm = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" @click="confirmClear">{{ t('common.clear') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showRemoveConfirm" max-width="420" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.removeItemTitle') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">{{ t('pos.removeItemText') }}</v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="cancelRemove">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" @click="confirmRemove">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showCustomerDialog" max-width="600" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.selectCustomer') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">
        <v-text-field
          v-model="customerSearch"
          variant="outlined"
          density="comfortable"
          :placeholder="t('pos.searchCustomers')"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
        />

        <v-list
          v-if="!customersStore.loading && filteredCustomers.length > 0"
          density="comfortable"
          class="mt-4"
        >
          <v-list-item
            v-for="customer in filteredCustomers"
            :key="customer.id"
            :value="customer.id"
            :active="selectedCustomerId === customer.id"
            min-height="56"
            @click="customer.id && selectCustomer(customer.id)"
          >
            <v-list-item-title>{{ customer.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ customer.phone || t('pos.noPhone') }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-sheet v-else-if="customersStore.loading" class="d-flex align-center justify-center py-8">
          <v-progress-circular indeterminate />
        </v-sheet>

        <v-sheet v-else class="text-center py-8 text-medium-emphasis">
          {{ t('pos.noCustomers') }}
        </v-sheet>
      </v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="clearCustomer">{{ t('common.clear') }}</v-btn>
        <v-btn variant="text" @click="showCustomerDialog = false">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDiscountDialog" max-width="400" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.applyDiscount') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">
        <MoneyInput
          v-model="discountInput"
          :label="t('pos.discountAmount')"
          grid-layout
          autofocus
          @keyup.enter="applyDiscount"
          :max="subtotal"
        />
      </v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="showDiscountDialog = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="applyDiscount">{{ t('common.apply') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showNoteDialog" max-width="500" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.addNote') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">
        <v-textarea
          v-model="noteInput"
          variant="outlined"
          density="comfortable"
          :label="t('pos.saleNote')"
          rows="3"
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-0 mt-6 d-flex align-center ga-2">
        <v-btn variant="text" @click="clearNote">{{ t('common.clear') }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="showNoteDialog = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="saveNote">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showHoldDialog" max-width="400" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.holdSale') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">
        <v-text-field
          v-model="holdName"
          variant="outlined"
          density="comfortable"
          :label="t('pos.holdName')"
          :placeholder="t('pos.holdNamePlaceholder')"
          autofocus
          @keyup.enter="confirmHold"
        />
      </v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="showHoldDialog = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="confirmHold">{{ t('pos.hold') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showResumeDialog" max-width="500" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.resumeSale') }}</v-card-title>
      <v-card-text class="pa-0 mt-4">
        <v-list v-if="heldSales.length > 0" density="comfortable">
          <v-list-item
            v-for="(sale, index) in heldSales"
            :key="index"
            min-height="64"
            @click="resumeHeldSale(index)"
          >
            <template #prepend>
              <v-icon>mdi-pause-circle</v-icon>
            </template>
            <v-list-item-title>
              {{ heldSaleName(sale, index) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ sale.items.length }} {{ t('common.items') }} - {{ formatCurrency(sale.total) }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                @click.stop="deleteHeldSale(index)"
              >
                <v-icon size="20">mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-sheet v-else class="text-center py-8 text-medium-emphasis">
          {{ t('pos.noHeldSales') }}
        </v-sheet>
      </v-card-text>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="showResumeDialog = false">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showMoreDialog" max-width="400" :fullscreen="$vuetify.display.xs">
    <v-card rounded="lg" class="pa-6">
      <v-card-title class="text-h6 pa-0">{{ t('pos.moreOptions') }}</v-card-title>
      <v-list density="comfortable" class="mt-4">
        <v-list-item min-height="64" @click="openResumeDialog">
          <template #prepend>
            <v-icon>mdi-play-circle</v-icon>
          </template>
          <v-list-item-title>{{ t('pos.resumeSale') }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ heldSales.length }} {{ t('pos.heldSalesCount') }}
          </v-list-item-subtitle>
          <template #append>
            <v-hotkey border="0" display-mode="icon" elevation="0" keys="f3" />
          </template>
        </v-list-item>

        <v-list-item min-height="64" @click="resetSale">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          <v-list-item-title>{{ t('pos.newSale') }}</v-list-item-title>
          <v-list-item-subtitle>{{ t('pos.startFresh') }}</v-list-item-subtitle>
          <template #append>
            <v-hotkey border="0" display-mode="icon" elevation="0" keys="f1" />
          </template>
        </v-list-item>
      </v-list>
      <v-card-actions class="pa-0 mt-6 justify-end ga-2">
        <v-btn variant="text" @click="showMoreDialog = false">{{ t('common.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <StockAlert
    :show="showStockAlert"
    :message="stockAlertMessage"
    :title="t('errors.outOfStock')"
    :show-cancel="false"
    :confirm-text="t('common.close')"
    confirm-color="primary"
    @confirm="showStockAlert = false"
  />

  <v-snackbar v-model="showScanFeedback" :color="scanFeedbackColor" :timeout="2000" location="top">
    <div class="d-flex align-center">
      <v-icon :icon="scanFeedbackIcon" class="mr-2" />
      {{ scanFeedbackMessage }}
    </div>
  </v-snackbar>

  <v-snackbar
    v-model="showPaymentToast"
    :color="paymentToastColor"
    :timeout="2200"
    location="bottom"
  >
    {{ paymentToastMessage }}
  </v-snackbar>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useHotkey } from 'vuetify';
import { mapErrorToArabic, t } from '@/i18n/t';
import { useProductsStore } from '@/stores/productsStore';
import { useSalesStore } from '@/stores/salesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCustomersStore } from '@/stores/customersStore';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore';
import { useCurrency } from '@/composables/useCurrency';
import ProductTile from '@/components/pos/ProductTile.vue';
import CategoryStrip from '@/components/pos/CategoryStrip.vue';
import CartPanel from '@/components/pos/CartPanel.vue';
import TotalsPanel from '@/components/pos/TotalsPanel.vue';
import PosActionBar from '@/components/pos/PosActionBar.vue';
import PaymentOverlay from '@/components/pos/PaymentOverlay.vue';
import StockAlert from '@/components/StockAlert.vue';
import type { Product, SaleItem, SaleInput, Category } from '@/types/domain';
import { categoriesClient, posClient, productsClient } from '@/ipc';
import type { ProductUnit } from '@/types/domain';
import { useGlobalBarcodeScanner } from '@/composables/useGlobalBarcodeScanner';
import MoneyInput from '@/components/shared/MoneyInput.vue';
import { generateIdempotencyKey } from '@/utils/idempotency';

const productsStore = useProductsStore();
const salesStore = useSalesStore();
const customersStore = useCustomersStore();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const featureFlagsStore = useFeatureFlagsStore();
const { currency, formatCurrency: currencyFormatter } = useCurrency();

type TextFieldRef = {
  focus?: () => void;
  $el?: HTMLElement;
};

const searchField = ref<TextFieldRef | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const selectedCategory = ref<number | null>(null);
const dbCategories = ref<Category[]>([]);

const cartItems = ref<SaleItem[]>([]);

// Cache of product units keyed by productId
const productUnitsCache = ref<Map<number, ProductUnit[]>>(new Map());

// Map of available units for each cart item index (computed from cache)
const cartItemUnitsMap = computed(() => {
  const map = new Map<number, ProductUnit[]>();
  cartItems.value.forEach((item, idx) => {
    const units = productUnitsCache.value.get(item.productId);
    if (units && units.length > 0) {
      map.set(
        idx,
        units.filter((u) => u.isActive)
      );
    }
  });
  return map;
});
const discount = ref(0);
const tax = ref(0);
const selectedCustomerId = ref<number | null>(null);
const saleNote = ref<string | null>(null);

const isProcessingPayment = ref(false);
const payOpen = ref(false);

const showClearConfirm = ref(false);
const showRemoveConfirm = ref(false);
const showCustomerDialog = ref(false);
const showDiscountDialog = ref(false);
const showNoteDialog = ref(false);
const showHoldDialog = ref(false);
const showResumeDialog = ref(false);
const showMoreDialog = ref(false);
const showStockAlert = ref(false);
const stockAlertMessage = ref('');

const showScanFeedback = ref(false);
const scanFeedbackMessage = ref('');
const scanFeedbackColor = ref('success');
const scanFeedbackIcon = ref('mdi-check-circle');
const showPaymentToast = ref(false);
const paymentToastMessage = ref('');
const paymentToastColor = ref<'success' | 'error'>('success');

const pendingRemoveIndex = ref<number | null>(null);
const customerSearch = ref('');
const discountInput = ref(0);
const noteInput = ref('');
const holdName = ref('');

interface HeldSale {
  name: string;
  items: SaleItem[];
  discount: number;
  tax: number;
  customerId: number | null;
  note: string | null;
  total: number;
  timestamp: number;
}

type PaymentOverlayPayload = {
  paid: number;
  paymentType: SaleInput['paymentType'];
  discount?: number;
  paymentMethod?: string;
  referenceNumber?: string;
};

const heldSales = ref<HeldSale[]>([]);

// Global barcode scanner integration
const scanner = useGlobalBarcodeScanner({
  mode: 'pos',
  onScan: handleBarcodeScan,
  minLength: 4,
  maxInterKeyMs: 35,
  idleTimeoutMs: 180,
});

async function handleBarcodeScan(barcode: string) {
  // Find product by barcode
  const product = await productsStore.findProductByBarcode(barcode);

  if (!product) {
    showScanError();
    return;
  }

  if (!product.isActive) {
    showScanWarning(t('pos.productInactive'));
    return;
  }

  // Add to cart
  const success = await addToCart(product);
  if (success) {
    showScanSuccess(product.name);
  }
}

const categories = computed(() => {
  const allCategories = [{ id: null as number | null, name: t('common.all') }];
  const activeCategories = dbCategories.value
    .filter((c) => c.isActive)
    .map((c) => ({
      id: c.id ?? null,
      name: c.name,
    }));

  return [...allCategories, ...activeCategories];
});

const filteredProducts = computed(() => {
  let products = productsStore.items.filter((p) => p.isActive);

  if (selectedCategory.value !== null) {
    products = products.filter((p) => p.categoryId === selectedCategory.value);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    );
  }

  return products;
});

const filteredCustomers = computed(() => {
  if (!customerSearch.value.trim()) {
    return customersStore.items;
  }
  const query = customerSearch.value.toLowerCase();
  return customersStore.items.filter(
    (c) => c.name.toLowerCase().includes(query) || c.phone?.toLowerCase().includes(query)
  );
});

const cashierName = computed(() => authStore.currentUser?.username || 'POS Client');

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice - (item.discount || 0);
  }, 0);
});

const total = computed(() => {
  return Math.max(0, subtotal.value - discount.value + tax.value);
});

const anyDialogOpen = computed(() => {
  return (
    payOpen.value ||
    showClearConfirm.value ||
    showRemoveConfirm.value ||
    showCustomerDialog.value ||
    showDiscountDialog.value ||
    showNoteDialog.value ||
    showHoldDialog.value ||
    showResumeDialog.value ||
    showMoreDialog.value
  );
});

function formatCurrency(value: number): string {
  return currencyFormatter(value);
}

function heldSaleName(sale: HeldSale, index: number): string {
  return sale.name || `عملية ${index + 1}`;
}

// Stock is managed by the backend via inventory movements.
// Cart operations simply track what the user wants to buy.
// Product stock numbers are refreshed from the DB after each sale.

const resolveSearchInput = () => {
  searchInput.value =
    (searchField.value?.$el?.querySelector('input') as HTMLInputElement | null) ?? null;
};

const focusSearchInput = () => {
  if (!searchInput.value) {
    resolveSearchInput();
  }
};

const loadHeldSales = () => {
  try {
    const stored = localStorage.getItem('nuqta_held_sales');
    if (stored) {
      heldSales.value = JSON.parse(stored);
    }
  } catch (error) {
    console.error(error);
    heldSales.value = [];
  }
};

const saveHeldSales = () => {
  try {
    localStorage.setItem('nuqta_held_sales', JSON.stringify(heldSales.value));
  } catch (error) {
    console.error(error);
  }
};

function selectCategory(id: number | null) {
  selectedCategory.value = id;
}

function handleSearch() {
  return;
}

function clearSearch() {
  searchQuery.value = '';
}

function normalizeSearchToken(value: string): string {
  return value.trim().toLowerCase();
}

function findProductByScanToken(scanToken: string): Product | undefined {
  //  focus search input
  focusSearchInput();
  const token = normalizeSearchToken(scanToken);
  return productsStore.items.find((product) => {
    if (!product.isActive) return false;
    const barcode = normalizeSearchToken(product.barcode ?? '');
    const sku = normalizeSearchToken(product.sku ?? '');
    return barcode === token || sku === token;
  });
}

function showScanSuccess(productName: string) {
  scanFeedbackMessage.value = `${t('pos.productAdded')}: ${productName}`;
  scanFeedbackColor.value = 'success';
  scanFeedbackIcon.value = 'mdi-check-circle';
  showScanFeedback.value = true;
}

function showScanError() {
  scanFeedbackMessage.value = `${t('pos.barcodeNotFound')}`;
  scanFeedbackColor.value = 'error';
  scanFeedbackIcon.value = 'mdi-alert-circle';
  showScanFeedback.value = true;
}

function showScanWarning(message: string) {
  scanFeedbackMessage.value = message;
  scanFeedbackColor.value = 'warning';
  scanFeedbackIcon.value = 'mdi-alert';
  showScanFeedback.value = true;
}

function showPaymentMessage(message: string, color: 'success' | 'error') {
  paymentToastMessage.value = message;
  paymentToastColor.value = color;
  showPaymentToast.value = true;
}

async function handleSearchSubmit() {
  const scanToken = normalizeSearchToken(searchQuery.value);
  if (!scanToken || productsStore.loading) return;

  const product = findProductByScanToken(scanToken);

  if (!product) {
    showScanError();
    clearSearch();
    focusSearchInput();
    return;
  }

  const success = await addToCart(product);

  if (success) {
    showScanSuccess(product.name);
  }

  clearSearch();
  focusSearchInput();
}

async function fetchProductUnits(productId: number): Promise<ProductUnit[]> {
  if (productUnitsCache.value.has(productId)) {
    return productUnitsCache.value.get(productId)!;
  }
  try {
    const result = await productsClient.getUnits(productId);
    const units = result.ok ? (result.data ?? []) : [];
    productUnitsCache.value.set(productId, units);
    return units;
  } catch {
    return [];
  }
}

async function addToCart(product: Product): Promise<boolean> {
  const productId = product.id ?? 0;

  // Fetch units (cached)
  const units = await fetchProductUnits(productId);
  const activeUnits = units.filter((u) => u.isActive);

  // Determine default unit
  const defaultUnit = activeUnits.find((u) => u.isDefault) || activeUnits[0];

  const unitPrice = defaultUnit?.sellingPrice ?? product.sellingPrice;
  const unitName = defaultUnit?.unitName ?? product.unit ?? 'pcs';
  const unitFactor = defaultUnit?.factorToBase ?? 1;

  if (unitPrice <= 0) {
    const proceed = confirm(t('pos.zeroPriceWarning'));
    if (!proceed) return false;
  }

  const existingIndex = cartItems.value.findIndex(
    (item) => item.productId === productId && item.unitName === unitName
  );

  if (existingIndex >= 0) {
    cartItems.value[existingIndex].quantity += 1;
  } else {
    cartItems.value.push({
      productId,
      productName: product.name,
      quantity: 1,
      unitPrice,
      discount: 0,
      subtotal: unitPrice,
      unitName,
      unitFactor,
    });
  }

  return true;
}

function handleUnitChange(payload: { index: number; unit: ProductUnit }) {
  const item = cartItems.value[payload.index];
  if (!item) return;
  item.unitName = payload.unit.unitName;
  item.unitFactor = payload.unit.factorToBase;
  item.unitPrice = payload.unit.sellingPrice ?? item.unitPrice;
  item.subtotal = item.quantity * item.unitPrice - (item.discount || 0);
}

function increaseQuantity(index: number) {
  const item = cartItems.value[index];
  item.quantity += 1;
}

function decreaseQuantity(index: number) {
  const item = cartItems.value[index];

  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    removeFromCart(index);
  }
}

function removeFromCart(index: number) {
  if (cartItems.value.length === 1) {
    pendingRemoveIndex.value = index;
    showRemoveConfirm.value = true;
    return;
  }

  cartItems.value.splice(index, 1);
}

function cancelRemove() {
  showRemoveConfirm.value = false;
  pendingRemoveIndex.value = null;
}

function confirmRemove() {
  if (pendingRemoveIndex.value !== null) {
    cartItems.value.splice(pendingRemoveIndex.value, 1);
  }
  showRemoveConfirm.value = false;
  pendingRemoveIndex.value = null;
}

function openClearConfirmDialog() {
  if (cartItems.value.length === 0) return;
  showClearConfirm.value = true;
}

function confirmClear() {
  showClearConfirm.value = false;
  resetSaleData();
  setTimeout(() => focusSearchInput(), 100);
}

function resetSaleData() {
  cartItems.value = [];
  discount.value = 0;
  tax.value = 0;
  selectedCustomerId.value = null;
  saleNote.value = null;
}

function openCustomerDialog() {
  customerSearch.value = '';
  showCustomerDialog.value = true;
  if (customersStore.items.length === 0) {
    void customersStore.fetchCustomers();
  }
}

function selectCustomer(customerId: number) {
  selectedCustomerId.value = customerId;
  showCustomerDialog.value = false;
}

function clearCustomer() {
  selectedCustomerId.value = null;
  showCustomerDialog.value = false;
}

function openDiscountDialog() {
  discountInput.value = discount.value;
  showDiscountDialog.value = true;
}

function applyDiscount() {
  if (discountInput.value >= 0 && discountInput.value <= subtotal.value) {
    discount.value = discountInput.value;
  }
  showDiscountDialog.value = false;
}

function openNoteDialog() {
  noteInput.value = saleNote.value || '';
  showNoteDialog.value = true;
}

function saveNote() {
  saleNote.value = noteInput.value.trim() || null;
  showNoteDialog.value = false;
}

function clearNote() {
  noteInput.value = '';
  saleNote.value = null;
}

function handleHold() {
  if (cartItems.value.length === 0) {
    alert(t('pos.nothingToHold'));
    return;
  }
  holdName.value = '';
  showHoldDialog.value = true;
}

function confirmHold() {
  const heldSale: HeldSale = {
    name: holdName.value.trim() || `عملية ${heldSales.value.length + 1}`,
    items: JSON.parse(JSON.stringify(cartItems.value)),
    discount: discount.value,
    tax: tax.value,
    customerId: selectedCustomerId.value,
    note: saleNote.value,
    total: total.value,
    timestamp: Date.now(),
  };

  heldSales.value.push(heldSale);
  saveHeldSales();

  // Clear cart (stock is managed by backend)
  cartItems.value = [];
  discount.value = 0;
  tax.value = 0;
  selectedCustomerId.value = null;
  saleNote.value = null;

  showHoldDialog.value = false;
  setTimeout(() => focusSearchInput(), 100);
}

function openResumeDialog() {
  showResumeDialog.value = true;
  showMoreDialog.value = false;
}

function resumeHeldSale(index: number) {
  const sale = heldSales.value[index];
  if (!sale) return;

  // Note: Stock was already decreased when sale was held, so we don't adjust again
  cartItems.value = JSON.parse(JSON.stringify(sale.items));
  discount.value = sale.discount;
  tax.value = sale.tax;
  selectedCustomerId.value = sale.customerId;
  saleNote.value = sale.note;

  heldSales.value.splice(index, 1);
  saveHeldSales();
  showResumeDialog.value = false;
}

function deleteHeldSale(index: number) {
  if (confirm(t('pos.confirmDeleteHeldSale'))) {
    heldSales.value.splice(index, 1);
    saveHeldSales();
  }
}

function openMoreDialog() {
  showMoreDialog.value = true;
}

function resetSale() {
  if (cartItems.value.length > 0) {
    if (confirm(t('pos.confirmResetSale'))) {
      resetSaleData();
      showMoreDialog.value = false;
      setTimeout(() => focusSearchInput(), 100);
    }
  } else {
    resetSaleData();
    showMoreDialog.value = false;
    setTimeout(() => focusSearchInput(), 100);
  }
}

function handlePay() {
  if (cartItems.value.length === 0 || isProcessingPayment.value) return;
  payOpen.value = true;
}

function triggerAfterPay(saleId: number) {
  void posClient
    .afterPay({
      saleId,
      printerName: settingsStore.selectedPrinter || undefined,
    })
    .then((result) => {
      if (!result.ok) {
        console.error('pos:afterPay failed', result.error);
      }
    })
    .catch((error) => {
      console.error('pos:afterPay failed', error);
    });
}

async function handlePaymentConfirm(overlayPayload: PaymentOverlayPayload) {
  if (cartItems.value.length === 0 || isProcessingPayment.value) return;

  const appliedDiscount = Math.min(
    Math.max(overlayPayload.discount ?? discount.value, 0),
    subtotal.value
  );
  const payableTotal = Math.max(0, subtotal.value - appliedDiscount + tax.value);
  const paidAmount = Math.max(overlayPayload.paid, 0);

  if (payableTotal <= 0) {
    showPaymentMessage('إجمالي المستحق يجب أن يكون أكبر من صفر', 'error');
    return;
  }

  const strictPaymentRequired = true;
  if (strictPaymentRequired && paidAmount < payableTotal) {
    showPaymentMessage('المبلغ المدفوع أقل من إجمالي المستحق', 'error');
    return;
  }

  isProcessingPayment.value = true;

  try {
    const invoiceNumber = `فاتورة-${Date.now()}`;

    const itemsWithSubtotals = cartItems.value.map((item) => ({
      ...item,
      subtotal: item.quantity * item.unitPrice - (item.discount || 0),
    }));

    const remainingAmount = Math.max(payableTotal - paidAmount, 0);

    const payload: SaleInput = {
      invoiceNumber,
      customerId: selectedCustomerId.value,
      subtotal: subtotal.value,
      discount: appliedDiscount,
      tax: tax.value,
      total: payableTotal,
      currency: currency.value,
      exchangeRate: 1,
      interestRate: 0,
      interestAmount: 0,
      paymentType: overlayPayload.paymentType || 'cash',
      paidAmount,
      remainingAmount,
      status: remainingAmount <= 0 ? 'completed' : 'pending',
      notes: saleNote.value,
      items: itemsWithSubtotals,
      paymentMethod: overlayPayload.paymentMethod,
      referenceNumber: overlayPayload.referenceNumber,
      idempotencyKey: generateIdempotencyKey('sale'),
    };

    const result = await salesStore.createSale(payload);

    if (result.ok) {
      const saleData = result.ok && 'data' in result ? result.data : null;

      cartItems.value = [];
      discount.value = 0;
      tax.value = 0;
      selectedCustomerId.value = null;
      saleNote.value = null;
      payOpen.value = false;

      showPaymentMessage(t('pos.saleCompleted'), 'success');
      setTimeout(() => focusSearchInput(), 100);

      // Refresh product stock from backend
      void productsStore.fetchProducts();

      if (saleData?.id) {
        triggerAfterPay(saleData.id);
      }
    } else if (!result.ok && 'error' in result) {
      console.error(result.error);
      showPaymentMessage(mapErrorToArabic(result.error, 'errors.unexpected'), 'error');
    }
  } catch (error) {
    console.error(error);
    showPaymentMessage(t('errors.unexpected'), 'error');
  } finally {
    isProcessingPayment.value = false;
  }
}

useHotkey(
  'f1',
  () => {
    if (anyDialogOpen.value) return;
    if (cartItems.value.length > 0) {
      resetSale();
    } else {
      focusSearchInput();
    }
  },
  { preventDefault: true }
);

useHotkey(
  'f2',
  () => {
    if (anyDialogOpen.value) return;
    handleHold();
  },
  { preventDefault: true }
);

useHotkey(
  'f3',
  () => {
    if (anyDialogOpen.value) return;
    openResumeDialog();
  },
  { preventDefault: true }
);

useHotkey(
  'f4',
  () => {
    if (anyDialogOpen.value) return;
    openCustomerDialog();
  },
  { preventDefault: true }
);

useHotkey(
  'f8',
  () => {
    if (anyDialogOpen.value) return;
    openDiscountDialog();
  },
  { preventDefault: true }
);

useHotkey(
  'f9',
  () => {
    if (anyDialogOpen.value) return;
    openClearConfirmDialog();
  },
  { preventDefault: true }
);

useHotkey(
  'f10',
  (e) => {
    const target = e.target as HTMLElement;
    if (
      target === searchInput.value ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA'
    ) {
      return;
    }
    if (anyDialogOpen.value) return;
    if (cartItems.value.length > 0) {
      handlePay();
    }
  },
  { preventDefault: true }
);

useHotkey(
  'escape',
  () => {
    if (payOpen.value) {
      payOpen.value = false;
    } else if (showClearConfirm.value) {
      showClearConfirm.value = false;
    } else if (showRemoveConfirm.value) {
      showRemoveConfirm.value = false;
    } else if (showCustomerDialog.value) {
      showCustomerDialog.value = false;
    } else if (showDiscountDialog.value) {
      showDiscountDialog.value = false;
    } else if (showNoteDialog.value) {
      showNoteDialog.value = false;
    } else if (showHoldDialog.value) {
      showHoldDialog.value = false;
    } else if (showResumeDialog.value) {
      showResumeDialog.value = false;
    } else if (showMoreDialog.value) {
      showMoreDialog.value = false;
    } else if (searchQuery.value) {
      clearSearch();
    } else {
      searchInput.value?.blur();
    }
  },
  { preventDefault: true }
);

useHotkey(
  'm',
  () => {
    if (anyDialogOpen.value) return;
    openMoreDialog();
  },
  { preventDefault: true }
);

useHotkey(
  'n',
  () => {
    if (anyDialogOpen.value) return;
    openNoteDialog();
  },
  { preventDefault: true }
);

async function loadCategories() {
  const result = await categoriesClient.getAll({});
  if (result.ok && result.data) {
    dbCategories.value = Array.isArray(result.data) ? result.data : [];
  }
}

onMounted(async () => {
  // Initialize held sales from localStorage (synchronous, fast)
  loadHeldSales();

  // Wait for DOM to fully render, then resolve and focus search input for immediate barcode scanning
  await nextTick();
  resolveSearchInput();
  focusSearchInput();

  // Load products and categories in parallel for faster startup
  await Promise.all([productsStore.fetchProducts(), loadCategories()]);

  // Start global barcode scanner
  scanner.start();
});

onUnmounted(() => {
  // Stop scanner when leaving POS page
  scanner.stop();
});
</script>
