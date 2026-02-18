<template>
  <v-container fluid>
    <v-skeleton-loader v-if="loading" type="card" />

    <template v-else-if="supplier">
      <v-row class="mb-4" align="center">
        <v-col>
          <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
          <span class="text-h5 font-weight-bold">{{ supplier.name }}</span>
        </v-col>
        <v-col cols="auto" class="d-flex ga-2">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-pencil"
            :to="{ name: 'SupplierEdit', params: { id: supplier.id } }"
            >تعديل</v-btn
          >
          <v-btn color="primary" prepend-icon="mdi-cash-minus" @click="showPaymentDialog = true"
            >تسجيل دفعة</v-btn
          >
        </v-col>
      </v-row>

      <v-row class="mb-4" dense>
        <v-col cols="6" sm="3">
          <v-card variant="tonal">
            <v-card-text class="text-center">
              <div class="text-caption">الهاتف</div>
              <div class="text-body-1" dir="ltr">{{ supplier.phone || '—' }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal">
            <v-card-text class="text-center">
              <div class="text-caption">المدينة</div>
              <div class="text-body-1">{{ supplier.city || '—' }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" :color="(supplier.currentBalance ?? 0) > 0 ? 'error' : 'success'">
            <v-card-text class="text-center">
              <div class="text-caption">الرصيد المستحق</div>
              <MoneyDisplay :amount="supplier.currentBalance ?? 0" size="lg" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-caption">عدد المشتريات</div>
              <div class="text-h6">{{ purchases.length }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="ledger">كشف الحساب</v-tab>
        <v-tab value="purchases">المشتريات</v-tab>
        <v-tab value="info">معلومات</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="ledger">
          <LedgerTable :entries="ledgerEntries" :loading="ledgerLoading" entity-type="supplier" />
        </v-window-item>

        <v-window-item value="purchases">
          <v-data-table
            :headers="purchaseHeaders"
            :items="purchases"
            :loading="purchasesLoading"
            density="compact"
            :items-per-page="20"
            @click:row="
              (_: Event, { item }: { item: any }) =>
                router.push({ name: 'PurchaseDetails', params: { id: item.id } })
            "
          >
            <template #item.total="{ item }">
              <MoneyDisplay :amount="item.total" size="sm" />
            </template>
            <template #item.remainingAmount="{ item }">
              <MoneyDisplay :amount="item.remainingAmount" size="sm" colored />
            </template>
            <template #item.createdAt="{ item }">
              {{ formatDate(item.createdAt) }}
            </template>
            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis">لا توجد مشتريات لهذا المورد</div>
            </template>
          </v-data-table>
        </v-window-item>

        <v-window-item value="info">
          <v-card max-width="500">
            <v-card-text>
              <div class="mb-2"><strong>الاسم:</strong> {{ supplier.name }}</div>
              <div class="mb-2"><strong>الهاتف:</strong> {{ supplier.phone || '—' }}</div>
              <div class="mb-2"><strong>العنوان:</strong> {{ supplier.address || '—' }}</div>
              <div class="mb-2"><strong>المدينة:</strong> {{ supplier.city || '—' }}</div>
              <div class="mb-2"><strong>ملاحظات:</strong> {{ supplier.notes || '—' }}</div>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <v-alert v-else type="warning" variant="tonal">لم يتم العثور على المورد</v-alert>

    <v-dialog v-model="showPaymentDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>تسجيل دفعة مورد</v-card-title>
        <v-card-text>
          <MoneyInput v-model="paymentAmount" label="المبلغ" class="mb-3" />
          <v-textarea
            v-model="paymentNotes"
            label="ملاحظات"
            variant="outlined"
            density="compact"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPaymentDialog = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="paymentLoading" @click="onRecordPayment">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { suppliersClient, supplierLedgerClient, purchasesClient } from '../../ipc';
import type { Supplier } from '@nuqtaplus/core';
import type { LedgerEntry } from '../../components/shared/LedgerTable.vue';
import type { Purchase } from '@nuqtaplus/core';
import LedgerTable from '../../components/shared/LedgerTable.vue';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';
import MoneyInput from '../../components/shared/MoneyInput.vue';
import { generateIdempotencyKey } from '../../utils/idempotency';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const supplier = ref<Supplier | null>(null);
const activeTab = ref('ledger');

const ledgerEntries = ref<LedgerEntry[]>([]);
const purchases = ref<Purchase[]>([]);
const ledgerLoading = ref(false);
const purchasesLoading = ref(false);

const showPaymentDialog = ref(false);
const paymentAmount = ref(0);
const paymentNotes = ref('');
const paymentLoading = ref(false);

const purchaseHeaders = [
  { title: 'رقم الفاتورة', key: 'invoiceNumber' },
  { title: 'التاريخ', key: 'createdAt', width: '140px' },
  { title: 'الإجمالي', key: 'total', align: 'end' as const },
  { title: 'المتبقي', key: 'remainingAmount', align: 'end' as const },
  { title: 'الحالة', key: 'status', width: '120px' },
];

onMounted(async () => {
  await refreshSupplier();
});

async function refreshSupplier() {
  const id = Number(route.params.id);
  const result = await suppliersClient.getById(id);
  if (result.ok) {
    supplier.value = result.data;
    await Promise.all([fetchLedger(id), fetchPurchases(id)]);
  }
  loading.value = false;
}

async function fetchLedger(supplierId: number) {
  ledgerLoading.value = true;
  const result = await supplierLedgerClient.getLedger(supplierId);
  if (result.ok) ledgerEntries.value = result.data.items as LedgerEntry[];
  ledgerLoading.value = false;
}

async function fetchPurchases(supplierId: number) {
  purchasesLoading.value = true;
  const result = await purchasesClient.getAll({ supplierId, limit: 100, offset: 0 });
  if (result.ok) purchases.value = result.data.items;
  purchasesLoading.value = false;
}

async function onRecordPayment() {
  if (!supplier.value || paymentAmount.value <= 0) return;
  paymentLoading.value = true;
  const result = await supplierLedgerClient.recordPayment({
    supplierId: supplier.value.id!,
    amount: paymentAmount.value,
    paymentMethod: 'cash',
    notes: paymentNotes.value || undefined,
    idempotencyKey: generateIdempotencyKey('supplier-payment'),
  });
  paymentLoading.value = false;
  if (!result.ok) return;
  showPaymentDialog.value = false;
  paymentAmount.value = 0;
  paymentNotes.value = '';
  await refreshSupplier();
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}
</script>
