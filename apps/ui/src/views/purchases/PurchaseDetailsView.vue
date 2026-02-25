<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
        <span class="text-h5 font-weight-bold">تفاصيل فاتورة المشتريات</span>
      </v-col>
      <v-col cols="auto" v-if="purchase && purchase.remainingAmount > 0">
        <v-btn color="primary" prepend-icon="mdi-cash-minus" @click="showPaymentDialog = true">
          تسجيل دفعة
        </v-btn>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="purchasesStore.loading" type="card" />

    <template v-else-if="purchase">
      <v-card class="mb-4">
        <v-card-text>
          <v-row dense>
            <v-col cols="6" sm="3"
              ><strong>رقم الفاتورة:</strong> {{ purchase.invoiceNumber }}</v-col
            >
            <v-col cols="6" sm="3"
              ><strong>التاريخ:</strong> {{ formatDate(purchase.createdAt) }}</v-col
            >
            <v-col cols="6" sm="3">
              <strong>الحالة:</strong>
              <v-chip
                :color="purchase.status === 'completed' ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ purchase.status === 'completed' ? 'مكتمل' : 'معلق' }}
              </v-chip>
            </v-col>
            <v-col cols="6" sm="3">
              <strong>الإجمالي:</strong> <MoneyDisplay :amount="purchase.total" size="md" />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-title class="text-subtitle-1 font-weight-bold">المنتجات</v-card-title>
        <v-data-table
          :headers="itemHeaders"
          :items="purchase.items ?? []"
          density="compact"
          :items-per-page="-1"
          hide-default-footer
        >
          <template #item.unitCost="{ item }">
            <MoneyDisplay :amount="item.unitCost" size="sm" />
          </template>
          <template #item.lineSubtotal="{ item }">
            <MoneyDisplay :amount="item.lineSubtotal" size="sm" />
          </template>
          <template #no-data>
            <div class="text-center py-6 text-medium-emphasis">لا توجد أصناف في هذه الفاتورة</div>
          </template>
        </v-data-table>
      </v-card>

      <v-row class="mb-4" dense>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1 font-weight-bold">الدفعات</v-card-title>
            <v-data-table
              :headers="paymentHeaders"
              :items="purchase.payments ?? []"
              density="compact"
              :items-per-page="10"
            >
              <template #item.amount="{ item }">
                <MoneyDisplay :amount="item.amount" size="sm" colored />
              </template>
              <template #item.paymentDate="{ item }">
                {{ formatDate(item.paymentDate) }}
              </template>
              <template #no-data>
                <div class="text-center py-6 text-medium-emphasis">لا توجد دفعات بعد</div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1 font-weight-bold">حركات المخزون</v-card-title>
            <v-data-table
              :headers="movementHeaders"
              :items="purchase.movements ?? []"
              density="compact"
              :items-per-page="10"
            >
              <template #item.movementType="{ item }">
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="item.movementType === 'in' ? 'success' : 'warning'"
                >
                  {{ item.movementType === 'in' ? 'دخول' : item.movementType }}
                </v-chip>
              </template>
              <template #item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
              <template #no-data>
                <div class="text-center py-6 text-medium-emphasis">لا توجد حركات مخزون</div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <v-card>
        <v-card-text>
          <v-row dense>
            <v-col cols="6" sm="3">
              <strong>المجموع الفرعي:</strong>
              <MoneyDisplay :amount="purchase.subtotal" size="md" />
            </v-col>
            <v-col cols="6" sm="3">
              <strong>الخصم:</strong> <MoneyDisplay :amount="purchase.discount" size="md" />
            </v-col>
            <v-col cols="6" sm="3">
              <strong>الضريبة:</strong> <MoneyDisplay :amount="purchase.tax" size="md" />
            </v-col>
            <v-col cols="6" sm="3">
              <strong>المدفوع:</strong>
              <MoneyDisplay :amount="purchase.paidAmount" size="md" colored />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="showPaymentDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>تسجيل دفعة</v-card-title>
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
import { computed, onMounted, ref } from 'vue';
import { formatDate } from '@/utils/formatters';
import { useRoute, useRouter } from 'vue-router';
import { usePurchasesStore } from '../../stores/purchasesStore';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';
import MoneyInput from '../../components/shared/MoneyInput.vue';
import { purchasesClient } from '../../ipc/purchasesClient';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { notifyError, notifySuccess, notifyWarn } from '@/utils/notify';
import { mapErrorToArabic } from '@/i18n/t';

const route = useRoute();
const router = useRouter();
const purchasesStore = usePurchasesStore();

const purchase = computed(() => purchasesStore.currentPurchase);

const showPaymentDialog = ref(false);
const paymentAmount = ref(0);
const paymentNotes = ref('');
const paymentLoading = ref(false);

async function onRecordPayment() {
  if (!purchase.value || paymentAmount.value <= 0) return;
  paymentLoading.value = true;
  const result = await purchasesClient.addPayment({
    purchaseId: purchase.value.id!,
    supplierId: purchase.value.supplierId,
    amount: paymentAmount.value,
    paymentMethod: 'cash',
    notes: paymentNotes.value || undefined,
    idempotencyKey: generateIdempotencyKey('purchase-payment'),
  });
  paymentLoading.value = false;
  if (!result.ok) {
    notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
    return;
  }
  showPaymentDialog.value = false;
  paymentAmount.value = 0;
  paymentNotes.value = '';
  purchasesStore.fetchPurchaseById(purchase.value.id!);
  notifySuccess('تم تسجيل الدفعة بنجاح');
}

const itemHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الوحدة', key: 'unitName' },
  { title: 'الكمية', key: 'quantity', align: 'center' as const },
  { title: 'سعر الوحدة', key: 'unitCost', align: 'end' as const },
  { title: 'المجموع', key: 'lineSubtotal', align: 'end' as const },
];

const paymentHeaders = [
  { title: 'التاريخ', key: 'paymentDate', width: '130px' },
  { title: 'الطريقة', key: 'paymentMethod' },
  { title: 'المبلغ', key: 'amount', align: 'end' as const },
];

const movementHeaders = [
  { title: 'التاريخ', key: 'createdAt', width: '130px' },
  { title: 'النوع', key: 'movementType' },
  { title: 'الكمية', key: 'quantityBase', align: 'center' as const },
  { title: 'قبل', key: 'stockBefore', align: 'center' as const },
  { title: 'بعد', key: 'stockAfter', align: 'center' as const },
];

onMounted(async () => {
  const result = await purchasesStore.fetchPurchaseById(Number(route.params.id));
  if (!result.ok) {
    notifyError(mapErrorToArabic(result.error, 'errors.loadFailed'));
    return;
  }
  if (!purchase.value) {
    notifyWarn('لم يتم العثور على الفاتورة', { dedupeKey: 'purchase-not-found' });
  }
});
</script>
