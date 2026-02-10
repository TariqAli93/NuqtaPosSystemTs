<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('sales.new') }}</div>
        <div class="win-subtitle">{{ t('sales.formHint') }}</div>
      </div>
      <v-card class="win-card win-card--padded" flat>
        <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-4">
          {{ localizedError }}
        </v-alert>
        <v-form class="win-form" @submit.prevent="submit">
          <div class="d-flex flex-wrap ga-2">
            <v-text-field v-model="form.invoiceNumber" :label="t('sales.invoice')" required />
            <v-text-field
              v-model.number="form.customerId"
              :label="t('sales.customerId')"
              type="number"
            />
            <v-select
              v-model="form.paymentType"
              :items="paymentTypes"
              :label="t('sales.paymentType')"
              item-title="title"
              item-value="value"
            />
            <v-text-field v-model="form.currency" :label="t('products.currency')" />
            <v-text-field
              v-model.number="form.discount"
              :label="t('sales.discount')"
              type="number"
            />
            <v-text-field v-model.number="form.tax" :label="t('sales.tax')" type="number" />
            <v-text-field
              v-model.number="form.paidAmount"
              :label="t('sales.paidAmount')"
              type="number"
            />
          </div>

          <v-divider class="my-4" />

          <div class="d-flex align-center justify-space-between">
            <div class="text-subtitle-1">{{ t('sales.lineItems') }}</div>
            <v-btn size="small" variant="text" class="win-ghost-btn" @click="addItem">{{
              t('sales.addItem')
            }}</v-btn>
          </div>
          <v-data-table
            :headers="itemHeaders"
            :items="items"
            density="comfortable"
            class="win-table mt-2"
            :hide-default-footer="true"
          >
            <template #item.productName="{ item }">
              <v-text-field v-model="item.productName" density="compact" hide-details />
            </template>
            <template #item.quantity="{ item }">
              <v-text-field
                v-model.number="item.quantity"
                type="number"
                density="compact"
                hide-details
              />
            </template>
            <template #item.unitPrice="{ item }">
              <v-text-field
                v-model.number="item.unitPrice"
                type="number"
                density="compact"
                hide-details
              />
            </template>
            <template #item.discount="{ item }">
              <v-text-field
                v-model.number="item.discount"
                type="number"
                density="compact"
                hide-details
              />
            </template>
            <template #item.subtotal="{ item }">
              {{ formatAmount(itemSubtotal(item)) }}
            </template>
            <template #item.actions="{ item }">
              <v-btn
                size="x-small"
                variant="text"
                class="win-ghost-btn"
                @click="removeItem(items.indexOf(item))"
              >
                {{ t('sales.remove') }}
              </v-btn>
            </template>
          </v-data-table>

          <v-divider class="my-4" />
          <div class="d-flex justify-end ga-4">
            <div>{{ t('sales.subtotal') }}: {{ formatAmount(subtotal) }}</div>
            <div>{{ t('sales.total') }}: {{ formatAmount(total) }}</div>
          </div>

          <v-textarea v-model="form.notes" :label="t('common.notes')" rows="3" class="mt-4" />

          <div class="d-flex ga-2 mt-4">
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              class="win-btn"
              :loading="store.loading"
            >
              {{ t('sales.create') }}
            </v-btn>
            <v-btn variant="text" class="win-ghost-btn" to="/sales">{{ t('common.cancel') }}</v-btn>
          </div>
        </v-form>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useSalesStore } from '../../stores/salesStore';
import { useCurrency } from '../../composables/useCurrency';
import type { SaleInput, SaleItem } from '../../types/domain';

const store = useSalesStore();
const router = useRouter();
const { currency } = useCurrency();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.saveFailed') : null
);

const itemHeaders = computed(() => [
  { title: t('sales.product'), key: 'productName' },
  { title: t('sales.qty'), key: 'quantity' },
  { title: t('sales.unitPrice'), key: 'unitPrice' },
  { title: t('sales.discount'), key: 'discount' },
  { title: t('sales.subtotal'), key: 'subtotal', sortable: false },
  { title: '', key: 'actions', sortable: false },
]);

const paymentTypes = computed(() => [
  { title: t('sales.cash'), value: 'cash' },
  { title: t('sales.installment'), value: 'installment' },
  { title: t('sales.mixed'), value: 'mixed' },
]);

const form = reactive({
  invoiceNumber: '',
  customerId: null as number | null,
  paymentType: 'cash' as SaleInput['paymentType'],
  currency: currency.value,
  discount: 0,
  tax: 0,
  paidAmount: 0,
  notes: null as string | null,
});

const items = ref<SaleItem[]>([
  {
    productId: 0,
    productName: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    subtotal: 0,
  },
]);

const itemSubtotal = (item: SaleItem) =>
  Math.max(0, item.quantity * item.unitPrice - (item.discount || 0));

const subtotal = computed(() => items.value.reduce((sum, item) => sum + itemSubtotal(item), 0));
const total = computed(() => subtotal.value - form.discount + form.tax);

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function addItem() {
  items.value.push({
    productId: 0,
    productName: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    subtotal: 0,
  });
}

function removeItem(index: number) {
  items.value.splice(index, 1);
}

async function submit() {
  const payload: SaleInput = {
    invoiceNumber: form.invoiceNumber,
    customerId: form.customerId,
    subtotal: subtotal.value,
    discount: form.discount,
    tax: form.tax,
    total: total.value,
    currency: form.currency,
    exchangeRate: 1,
    interestRate: 0,
    interestAmount: 0,
    paymentType: form.paymentType,
    paidAmount: form.paidAmount,
    remainingAmount: total.value - form.paidAmount,
    status: 'pending',
    notes: form.notes,
    items: items.value.map((item) => ({
      ...item,
      subtotal: itemSubtotal(item),
    })),
  };

  const result = await store.createSale(payload);
  if (result.ok) {
    const saleId = (result as any).data?.id;
    if (saleId) {
      await router.push(`/sales/${saleId}`);
      return;
    }
    await router.push('/sales');
  }
}
</script>
