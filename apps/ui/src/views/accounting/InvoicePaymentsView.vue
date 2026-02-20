<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">دفعات الفواتير</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          إضافة دفعات لفواتير المبيعات والمشتريات المعلّقة في شاشة واحدة.
        </p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="reloadAll">
        تحديث
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="successMessage = ''"
    >
      {{ successMessage }}
    </v-alert>

    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="sales">فواتير المبيعات ({{ salesInvoices.length }})</v-tab>
      <v-tab value="purchases">فواتير المشتريات ({{ purchaseInvoices.length }})</v-tab>
    </v-tabs>

    <v-row>
      <v-col cols="12" md="7">
        <v-card>
          <v-card-text>
            <v-data-table
              :headers="tableHeaders"
              :items="activeInvoices"
              :loading="loading"
              density="comfortable"
              :items-per-page="10"
              item-value="id"
              @click:row="onRowClick"
            >
              <template #item.invoiceNumber="{ item }">
                <span class="font-weight-medium">{{ item.invoiceNumber }}</span>
              </template>

              <template #item.party="{ item }">
                <span>{{ item.partyLabel }}</span>
              </template>

              <template #item.total="{ item }">
                <span>{{ formatMoney(item.total, item.currency) }}</span>
              </template>

              <template #item.remainingAmount="{ item }">
                <v-chip color="warning" variant="tonal" size="small">
                  {{ formatMoney(item.remainingAmount, item.currency) }}
                </v-chip>
              </template>

              <template #item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>

              <template #no-data>
                <div class="text-center py-6 text-medium-emphasis">لا توجد فواتير معلّقة</div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">إضافة دفعة</v-card-title>
          <v-card-text>
            <template v-if="selectedInvoice">
              <v-alert type="info" variant="tonal" class="mb-4">
                <div class="mb-1">
                  رقم الفاتورة: <strong>{{ selectedInvoice.invoiceNumber }}</strong>
                </div>
                <div class="mb-1">
                  {{ activeTab === 'sales' ? 'العميل' : 'المورد' }}:
                  <strong>{{ selectedInvoice.partyLabel }}</strong>
                </div>
                <div>
                  المتبقي:
                  <strong>{{
                    formatMoney(selectedInvoice.remainingAmount, selectedInvoice.currency)
                  }}</strong>
                </div>
              </v-alert>

              <v-form @submit.prevent="submitPayment">
                <v-text-field
                  v-model.number="paymentForm.amount"
                  label="المبلغ"
                  type="number"
                  :min="1"
                  :max="selectedInvoice.remainingAmount"
                  variant="outlined"
                  density="comfortable"
                  required
                  class="mb-3"
                />

                <v-select
                  v-model="paymentForm.paymentMethod"
                  :items="paymentMethods"
                  item-title="title"
                  item-value="value"
                  label="طريقة الدفع"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                />

                <v-text-field
                  v-model="paymentForm.paymentDate"
                  label="تاريخ الدفع"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                />

                <v-text-field
                  v-model="paymentForm.referenceNumber"
                  label="رقم المرجع"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                />

                <v-textarea
                  v-model="paymentForm.notes"
                  label="ملاحظات"
                  rows="2"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-btn type="submit" color="primary" :loading="submitting" block>
                  تسجيل الدفعة
                </v-btn>
              </v-form>
            </template>

            <template v-else>
              <div class="text-center py-8 text-medium-emphasis">
                اختر فاتورة من الجدول لإضافة دفعة
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { salesClient, purchasesClient } from '../../ipc';
import { generateIdempotencyKey } from '../../utils/idempotency';

type TabType = 'sales' | 'purchases';

type PendingInvoice = {
  id: number;
  invoiceNumber: string;
  partyLabel: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  exchangeRate?: number;
  createdAt?: string;
  customerId?: number;
  supplierId?: number;
};

const activeTab = ref<TabType>('sales');
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const salesInvoices = ref<PendingInvoice[]>([]);
const purchaseInvoices = ref<PendingInvoice[]>([]);

const selectedSaleId = ref<number | null>(null);
const selectedPurchaseId = ref<number | null>(null);

const paymentForm = reactive({
  amount: null as number | null,
  paymentMethod: 'cash',
  paymentDate: new Date().toISOString().slice(0, 10),
  referenceNumber: '',
  notes: '',
});

const paymentMethods = [
  { title: 'نقداً', value: 'cash' },
  { title: 'بطاقة', value: 'card' },
  { title: 'تحويل بنكي', value: 'bank_transfer' },
];

const tableHeaders = [
  { title: 'رقم الفاتورة', key: 'invoiceNumber' },
  { title: 'الطرف', key: 'party' },
  { title: 'الإجمالي', key: 'total' },
  { title: 'المتبقي', key: 'remainingAmount' },
  { title: 'التاريخ', key: 'createdAt' },
];

const activeInvoices = computed(() =>
  activeTab.value === 'sales' ? salesInvoices.value : purchaseInvoices.value
);

const selectedInvoice = computed(() => {
  if (activeTab.value === 'sales') {
    return salesInvoices.value.find((item) => item.id === selectedSaleId.value) || null;
  }
  return purchaseInvoices.value.find((item) => item.id === selectedPurchaseId.value) || null;
});

const formatMoney = (amount: number, currency = 'IQD') => {
  const formatted = new Intl.NumberFormat('ar-IQ', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(amount || 0);
  return `${formatted} ${currency}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
};

function resetForm() {
  paymentForm.amount = null;
  paymentForm.paymentMethod = 'cash';
  paymentForm.paymentDate = new Date().toISOString().slice(0, 10);
  paymentForm.referenceNumber = '';
  paymentForm.notes = '';
}

function onRowClick(_: Event, payload: { item: PendingInvoice }) {
  const invoice = payload.item;
  if (activeTab.value === 'sales') {
    selectedSaleId.value = invoice.id;
  } else {
    selectedPurchaseId.value = invoice.id;
  }
  paymentForm.amount = invoice.remainingAmount;
}

async function loadSalesInvoices() {
  const result = await salesClient.getAll({ status: 'pending', limit: 500, offset: 0 });
  if (!result.ok) {
    throw new Error(result.error.message || 'تعذر تحميل فواتير المبيعات');
  }

  salesInvoices.value = (result.data.items || [])
    .filter((sale: any) => Number(sale.remainingAmount || 0) > 0)
    .map((sale: any) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      partyLabel: sale.customerName || (sale.customerId ? `عميل #${sale.customerId}` : 'عميل نقدي'),
      total: sale.total,
      paidAmount: sale.paidAmount || 0,
      remainingAmount: sale.remainingAmount || 0,
      currency: sale.currency || 'IQD',
      exchangeRate: sale.exchangeRate,
      createdAt: sale.createdAt,
      customerId: sale.customerId,
    }));

  if (!salesInvoices.value.some((item) => item.id === selectedSaleId.value)) {
    selectedSaleId.value = null;
  }
}

async function loadPurchaseInvoices() {
  const result = await purchasesClient.getAll({ status: 'pending', limit: 500, offset: 0 });
  if (!result.ok) {
    throw new Error(result.error.message || 'تعذر تحميل فواتير المشتريات');
  }

  purchaseInvoices.value = (result.data.items || [])
    .filter((purchase: any) => Number(purchase.remainingAmount || 0) > 0)
    .map((purchase: any) => ({
      id: purchase.id,
      invoiceNumber: purchase.invoiceNumber,
      partyLabel: purchase.supplierName || `مورد #${purchase.supplierId}`,
      total: purchase.total,
      paidAmount: purchase.paidAmount || 0,
      remainingAmount: purchase.remainingAmount || 0,
      currency: purchase.currency || 'IQD',
      exchangeRate: purchase.exchangeRate,
      createdAt: purchase.createdAt,
      supplierId: purchase.supplierId,
    }));

  if (!purchaseInvoices.value.some((item) => item.id === selectedPurchaseId.value)) {
    selectedPurchaseId.value = null;
  }
}

async function reloadAll() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await Promise.all([loadSalesInvoices(), loadPurchaseInvoices()]);
  } catch (error: any) {
    errorMessage.value = error?.message || 'تعذر تحميل بيانات الفواتير';
  } finally {
    loading.value = false;
  }
}

async function submitPayment() {
  errorMessage.value = '';
  successMessage.value = '';

  const invoice = selectedInvoice.value;
  if (!invoice || !paymentForm.amount || paymentForm.amount <= 0) {
    errorMessage.value = 'يرجى اختيار فاتورة وإدخال مبلغ صحيح.';
    return;
  }

  submitting.value = true;

  try {
    if (activeTab.value === 'sales') {
      const result = await salesClient.addPayment(invoice.id, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod as any,
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate || 1,
        idempotencyKey: generateIdempotencyKey('sale-invoice-payment'),
      } as any);

      if (!result.ok) {
        throw new Error(result.error.message || 'تعذر تسجيل دفعة المبيعات');
      }

      successMessage.value = 'تم تسجيل دفعة فاتورة المبيعات بنجاح.';
      await loadSalesInvoices();
    } else {
      const result = await purchasesClient.addPayment({
        purchaseId: invoice.id,
        supplierId: invoice.supplierId,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate || 1,
        idempotencyKey: generateIdempotencyKey('purchase-invoice-payment'),
      });

      if (!result.ok) {
        throw new Error(result.error.message || 'تعذر تسجيل دفعة المشتريات');
      }

      successMessage.value = 'تم تسجيل دفعة فاتورة المشتريات بنجاح.';
      await loadPurchaseInvoices();
    }

    resetForm();
  } catch (error: any) {
    errorMessage.value = error?.message || 'حدث خطأ أثناء إضافة الدفعة';
  } finally {
    submitting.value = false;
  }
}

watch(activeTab, () => {
  errorMessage.value = '';
  successMessage.value = '';
  resetForm();
});

onMounted(() => {
  void reloadAll();
});
</script>
