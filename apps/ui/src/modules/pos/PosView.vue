<template>
  <v-container fluid>
    <CartPanel
      :items="cartItems"
      @increase="increaseQuantity"
      @decrease="decreaseQuantity"
      @remove="removeFromCart"
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

    <v-app-bar class="mb-5">
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
          prepend-inner-icon="mdi-magnify"
          @update:model-value="handleSearch"
          @click:clear="clearSearch"
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
        <v-text-field
          v-model.number="discountInput"
          variant="outlined"
          density="comfortable"
          type="number"
          :label="t('pos.discountAmount')"
          prefix="$"
          min="0"
          :max="subtotal"
          autofocus
          @keyup.enter="applyDiscount"
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
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useHotkey } from 'vuetify';
import { mapErrorToArabic, t } from '@/i18n/t';
import { useProductsStore } from '@/stores/productsStore';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomersStore } from '@/stores/customersStore';
import { useCurrency } from '@/composables/useCurrency';
import ProductTile from '@/components/pos/ProductTile.vue';
import CategoryStrip from '@/components/pos/CategoryStrip.vue';
import CartPanel from '@/components/pos/CartPanel.vue';
import TotalsPanel from '@/components/pos/TotalsPanel.vue';
import PosActionBar from '@/components/pos/PosActionBar.vue';
import StockAlert from '@/components/StockAlert.vue';
import type { Product, SaleItem, SaleInput, Category } from '@/types/domain';
import { categoriesClient } from '@/ipc';

const router = useRouter();
const productsStore = useProductsStore();
const salesStore = useSalesStore();
const customersStore = useCustomersStore();
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
const discount = ref(0);
const tax = ref(0);
const selectedCustomerId = ref<number | null>(null);
const saleNote = ref<string | null>(null);

const isProcessingPayment = ref(false);

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

const heldSales = ref<HeldSale[]>([]);

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

/**
 * Centralized stock adjustment function - single source of truth for stock updates.
 * @param productId - The product ID to adjust
 * @param change - The amount to change (negative to decrease, positive to increase)
 * @returns true if adjustment succeeded, false if it would result in negative stock
 */
function adjustProductStock(productId: number, change: number): boolean {
  const product = productsStore.items.find((p) => p.id === productId);
  if (!product) {
    console.error(`Product ${productId} not found in store`);
    return false;
  }

  const newStock = product.stock + change;

  // Prevent negative stock
  if (newStock < 0) {
    stockAlertMessage.value = t('errors.outOfStock');
    showStockAlert.value = true;
    return false;
  }

  // Update the store (this is reactive and will update the UI)
  product.stock = newStock;
  return true;
}

const resolveSearchInput = () => {
  searchInput.value =
    (searchField.value?.$el?.querySelector('input') as HTMLInputElement | null) ?? null;
};

const focusSearchInput = () => {
  if (!searchInput.value) {
    resolveSearchInput();
  }

  if (searchField.value?.focus) {
    searchField.value.focus();
  } else {
    searchInput.value?.focus();
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

async function addToCart(product: Product) {
  if (product.sellingPrice <= 0) {
    const proceed = confirm(t('pos.zeroPriceWarning'));
    if (!proceed) return;
  }

  const productId = product.id ?? 0;

  // CRITICAL: Decrease stock in Product Store FIRST before adding to cart
  if (!adjustProductStock(productId, -1)) {
    // Stock adjustment failed - alert already shown by adjustProductStock
    return;
  }

  const existingIndex = cartItems.value.findIndex((item) => item.productId === productId);

  if (existingIndex >= 0) {
    cartItems.value[existingIndex].quantity += 1;
  } else {
    cartItems.value.push({
      productId: productId,
      productName: product.name,
      quantity: 1,
      unitPrice: product.sellingPrice,
      discount: 0,
      subtotal: product.sellingPrice,
    });
  }
}

// Increase quantity - decreases Product Store stock
function increaseQuantity(index: number) {
  const item = cartItems.value[index];

  // Attempt to decrease stock by 1
  if (!adjustProductStock(item.productId, -1)) {
    // Stock not available - alert already shown
    return;
  }

  // Stock adjustment succeeded, update cart quantity
  item.quantity += 1;
}

// Decrease quantity - increases Product Store stock back
function decreaseQuantity(index: number) {
  const item = cartItems.value[index];

  if (item.quantity > 1) {
    // Return 1 unit back to stock
    adjustProductStock(item.productId, 1);
    item.quantity -= 1;
  } else {
    // Last item - remove from cart
    removeFromCart(index);
  }
}

function removeFromCart(index: number) {
  if (cartItems.value.length === 1) {
    pendingRemoveIndex.value = index;
    showRemoveConfirm.value = true;
    return;
  }

  const item = cartItems.value[index];
  // Return ALL quantity back to Product Store
  adjustProductStock(item.productId, item.quantity);
  cartItems.value.splice(index, 1);
}

function cancelRemove() {
  showRemoveConfirm.value = false;
  pendingRemoveIndex.value = null;
}

function confirmRemove() {
  if (pendingRemoveIndex.value !== null) {
    const item = cartItems.value[pendingRemoveIndex.value];
    // Return ALL quantity back to Product Store
    adjustProductStock(item.productId, item.quantity);
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
  // CRITICAL: Restore ALL stock to Product Store before clearing cart
  cartItems.value.forEach((item) => {
    adjustProductStock(item.productId, item.quantity);
  });

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

  // Note: Stock remains decreased for held sales (they're still "in progress")
  // We simply clear the cart without restoring stock
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
    const sale = heldSales.value[index];

    // CRITICAL: Restore stock to Product Store when deleting a held sale
    sale.items.forEach((item) => {
      adjustProductStock(item.productId, item.quantity);
    });

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

async function handlePay() {
  if (cartItems.value.length === 0 || isProcessingPayment.value) return;

  isProcessingPayment.value = true;

  try {
    const invoiceNumber = `فاتورة-${Date.now()}`;

    const itemsWithSubtotals = cartItems.value.map((item) => ({
      ...item,
      subtotal: item.quantity * item.unitPrice - (item.discount || 0),
    }));

    const payload: SaleInput = {
      invoiceNumber,
      customerId: selectedCustomerId.value,
      subtotal: subtotal.value,
      discount: discount.value,
      tax: tax.value,
      total: total.value,
      currency: currency.value,
      exchangeRate: 1,
      interestRate: 0,
      interestAmount: 0,
      paymentType: 'cash',
      paidAmount: total.value,
      remainingAmount: 0,
      status: 'completed',
      notes: saleNote.value,
      items: itemsWithSubtotals,
    };

    console.log(payload);

    const result = await salesStore.createSale(payload);

    if (result.ok) {
      // Sale completed successfully - stock already decreased, just clear cart
      cartItems.value = [];
      discount.value = 0;
      tax.value = 0;
      selectedCustomerId.value = null;
      saleNote.value = null;

      alert(t('pos.saleCompleted'));
      setTimeout(() => focusSearchInput(), 100);

      if (result.ok && 'data' in result && result.data?.id) {
        const goToDetails = confirm(t('pos.viewDetails'));
        if (goToDetails) {
          await router.push(`/sales/${result.data.id}`);
        }
      }
    } else if (!result.ok && 'error' in result) {
      // Sale failed - restore ALL stock back to Product Store
      cartItems.value.forEach((item) => {
        adjustProductStock(item.productId, item.quantity);
      });
      console.error(result.error);
      alert(mapErrorToArabic(result.error, 'errors.unexpected'));
    }
  } catch (error) {
    // Sale failed - restore ALL stock back to Product Store
    cartItems.value.forEach((item) => {
      adjustProductStock(item.productId, item.quantity);
    });
    console.error(error);
    alert(t('errors.unexpected'));
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
  'enter',
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
      void handlePay();
    }
  },
  { preventDefault: true }
);

useHotkey(
  'escape',
  () => {
    if (showClearConfirm.value) {
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
  await nextTick();

  resolveSearchInput();
  focusSearchInput();
  loadHeldSales();

  await productsStore.fetchProducts();

  await loadCategories();
});
</script>
