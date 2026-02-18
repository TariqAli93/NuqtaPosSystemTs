<template>
  <v-container fluid>
    <v-row class="mb-3" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">مساحة عمل المالية والمخزون</h1>
        <div class="text-caption text-medium-emphasis">
          لوحة موحدة للمخزون، المطابقة، المحاسبة، ودفاتر العملاء/الموردين.
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2">
        <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="reloadAll">تحديث الكل</v-btn>
      </v-col>
    </v-row>

    <v-tabs v-model="section" color="primary" show-arrows>
      <v-tab value="inventory">المخزون</v-tab>
      <v-tab value="reconciliation">مطابقة المخزون</v-tab>
      <v-tab value="accounting">المحاسبة</v-tab>
      <v-tab value="ar">دفتر العملاء (AR)</v-tab>
      <v-tab value="ap">دفتر الموردين (AP)</v-tab>
    </v-tabs>
    <v-divider class="mb-3" />

    <v-window v-model="section">
      <v-window-item value="inventory">
        <v-row dense class="mb-3">
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center">
                <div class="text-caption">قيمة المخزون</div>
                <div class="text-h6">
                  {{ (inventoryStore.dashboard?.totalValuation || 0).toLocaleString('en-US') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="warning">
              <v-card-text class="text-center">
                <div class="text-caption">منتجات منخفضة</div>
                <div class="text-h6">{{ inventoryStore.dashboard?.lowStockCount || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="error">
              <v-card-text class="text-center">
                <div class="text-caption">تنبيهات صلاحية</div>
                <div class="text-h6">{{ inventoryStore.dashboard?.expiryAlertCount || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-caption">حركات مسجلة</div>
                <div class="text-h6">{{ inventoryStore.movementsTotal }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card>
          <v-card-title class="text-subtitle-1 font-weight-bold">آخر حركات المخزون</v-card-title>
          <v-data-table
            :headers="movementHeaders"
            :items="inventoryStore.movements"
            :loading="inventoryStore.loading"
            density="compact"
            :items-per-page="15"
          >
            <template #item.createdAt="{ item }">
              {{ formatDate(item.createdAt) }}
            </template>
            <template #item.movementType="{ item }">
              <v-chip size="x-small" variant="tonal" :color="movementColor(item.movementType)">
                {{ movementLabel(item.movementType) }}
              </v-chip>
            </template>
            <template #item.quantityBase="{ item }">
              <span :class="movementSignedClass(item.movementType)">
                {{ movementSignedPrefix(item.movementType) }}{{ item.quantityBase }}
              </span>
            </template>
            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis">
                لا توجد حركات مخزون بعد. ستظهر الحركات بعد البيع/الشراء/التعديل.
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="reconciliation">
        <v-card class="mb-3">
          <v-card-text class="d-flex ga-2">
            <v-btn
              color="primary"
              variant="tonal"
              :loading="inventoryStore.loading"
              @click="runStockReconciliation(false)"
            >
              فحص فقط
            </v-btn>
            <v-btn
              color="warning"
              :loading="inventoryStore.loading"
              @click="runStockReconciliation(true)"
            >
              إصلاح الفروقات
            </v-btn>
          </v-card-text>
        </v-card>

        <v-row dense class="mb-2">
          <v-col cols="6" md="3">
            <v-card variant="tonal">
              <v-card-text class="text-center">
                <div class="text-caption">منتجات مفحوصة</div>
                <div class="text-h6">{{ inventoryStore.reconciliation?.totalProducts || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="error">
              <v-card-text class="text-center">
                <div class="text-caption">منتجات بها فرق</div>
                <div class="text-h6">{{ inventoryStore.reconciliation?.driftItems.length || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="warning">
              <v-card-text class="text-center">
                <div class="text-caption">إجمالي الفروقات</div>
                <div class="text-h6">{{ inventoryStore.reconciliation?.totalDrift || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="info">
              <v-card-text class="text-center">
                <div class="text-caption">تم إصلاحها</div>
                <div class="text-h6">{{ inventoryStore.reconciliation?.repairedCount || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-alert type="info" variant="tonal" class="mb-2">
          المقارنة بين `products.stock` (رصيد مخزن) و `inventory_movements` (رصيد مشتق من الدفتر).
        </v-alert>

        <v-data-table
          :headers="reconciliationHeaders"
          :items="inventoryStore.reconciliation?.driftItems || []"
          :loading="inventoryStore.loading"
          density="compact"
          :items-per-page="25"
        >
          <template #item.drift="{ item }">
            <v-chip size="x-small" :color="item.drift === 0 ? 'success' : 'error'" variant="tonal">
              {{ item.drift }}
            </v-chip>
          </template>
          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">لا توجد فروقات حالياً</div>
          </template>
        </v-data-table>
      </v-window-item>

      <v-window-item value="accounting">
        <v-tabs v-model="accountingTab" color="primary" density="comfortable">
          <v-tab value="accounts">دليل الحسابات</v-tab>
          <v-tab value="journal">القيود اليومية</v-tab>
          <v-tab value="trial">ميزان المراجعة</v-tab>
          <v-tab value="pnl">الأرباح والخسائر</v-tab>
          <v-tab value="balance">الميزانية</v-tab>
        </v-tabs>
        <v-divider class="mb-2" />

        <v-alert
          v-if="showAccountingEmptyBanner"
          type="warning"
          variant="tonal"
          class="mb-2"
        >
          لا توجد قيود محاسبية بعد. إذا كانت عمليات البيع/الشراء لا تُنتج قيوداً، سيبقى هذا القسم فارغاً.
        </v-alert>

        <v-window v-model="accountingTab">
          <v-window-item value="accounts">
            <v-data-table
              :headers="accountHeaders"
              :items="accountingStore.accounts"
              :loading="accountingStore.loading"
              density="compact"
              :items-per-page="-1"
              hide-default-footer
            >
              <template #item.balance="{ item }">{{ formatMoney(item.balance || 0) }}</template>
              <template #no-data>
                <div class="text-center py-8 text-medium-emphasis">
                  لا يوجد دليل حسابات بعد.
                </div>
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="journal">
            <v-data-table
              :headers="journalHeaders"
              :items="accountingStore.journalEntries"
              :loading="accountingStore.loading"
              density="compact"
              :items-per-page="20"
            >
              <template #item.entryDate="{ item }">{{ formatDate(item.entryDate) }}</template>
              <template #item.totalAmount="{ item }">{{ formatMoney(item.totalAmount || 0) }}</template>
              <template #no-data>
                <div class="text-center py-8 text-medium-emphasis">
                  لا توجد قيود محاسبية بعد.
                </div>
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="trial">
            <v-data-table
              :headers="trialHeaders"
              :items="accountingStore.trialBalance"
              :loading="accountingStore.loading"
              density="compact"
              :items-per-page="20"
            >
              <template #item.debitTotal="{ item }">{{ formatMoney(item.debitTotal || 0) }}</template>
              <template #item.creditTotal="{ item }">{{ formatMoney(item.creditTotal || 0) }}</template>
              <template #item.balance="{ item }">{{ formatMoney(item.balance || 0) }}</template>
              <template #no-data>
                <div class="text-center py-8 text-medium-emphasis">لا توجد بيانات ميزان مراجعة بعد.</div>
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="pnl">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <div class="text-caption">إجمالي الإيرادات</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.profitLoss?.totalRevenue || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="error">
                  <v-card-text class="text-center">
                    <div class="text-caption">إجمالي المصاريف</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.profitLoss?.totalExpenses || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card
                  variant="tonal"
                  :color="(accountingStore.profitLoss?.netIncome || 0) >= 0 ? 'primary' : 'warning'"
                >
                  <v-card-text class="text-center">
                    <div class="text-caption">صافي الدخل</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.profitLoss?.netIncome || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="balance">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <div class="text-caption">إجمالي الأصول</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.balanceSheet?.totalAssets || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="error">
                  <v-card-text class="text-center">
                    <div class="text-caption">إجمالي الالتزامات</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.balanceSheet?.totalLiabilities || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="info">
                  <v-card-text class="text-center">
                    <div class="text-caption">إجمالي حقوق الملكية</div>
                    <div class="text-h6">
                      {{ formatMoney(accountingStore.balanceSheet?.totalEquity || 0) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-window-item>

      <v-window-item value="ar">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title class="text-subtitle-1 font-weight-bold">العملاء</v-card-title>
              <v-data-table
                :headers="customerHeaders"
                :items="ledgerStore.customers"
                :loading="ledgerStore.loading.customers"
                density="compact"
                :items-per-page="15"
                @click:row="onSelectCustomer"
              >
                <template #item.totalDebt="{ item }">{{ formatMoney(item.totalDebt || 0) }}</template>
                <template #no-data>
                  <div class="text-center py-8 text-medium-emphasis">لا يوجد عملاء</div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-card class="mb-2">
              <v-card-text class="d-flex align-center ga-2">
                <v-btn
                  variant="tonal"
                  color="warning"
                  :loading="ledgerStore.loading.reconciliation"
                  @click="ledgerStore.reconcileCustomerDebt(false)"
                >
                  مطابقة AR
                </v-btn>
                <v-btn
                  variant="text"
                  :disabled="!ledgerStore.selectedCustomerId"
                  @click="reloadCustomerLedger"
                >
                  تحديث دفتر العميل
                </v-btn>
              </v-card-text>
            </v-card>
            <LedgerTable
              :entries="customerLedgerRows"
              :loading="ledgerStore.loading.customerLedger"
              entity-type="customer"
            />
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="ap">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title class="text-subtitle-1 font-weight-bold">الموردون</v-card-title>
              <v-data-table
                :headers="supplierHeaders"
                :items="ledgerStore.suppliers"
                :loading="ledgerStore.loading.suppliers"
                density="compact"
                :items-per-page="15"
                @click:row="onSelectSupplier"
              >
                <template #item.currentBalance="{ item }">
                  {{ formatMoney(item.currentBalance || 0) }}
                </template>
                <template #no-data>
                  <div class="text-center py-8 text-medium-emphasis">لا يوجد موردون</div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-card class="mb-2">
              <v-card-text class="d-flex align-center ga-2">
                <v-btn
                  variant="tonal"
                  color="warning"
                  :loading="ledgerStore.loading.reconciliation"
                  @click="ledgerStore.reconcileSupplierBalance(false)"
                >
                  مطابقة AP
                </v-btn>
                <v-btn
                  variant="text"
                  :disabled="!ledgerStore.selectedSupplierId"
                  @click="reloadSupplierLedger"
                >
                  تحديث دفتر المورد
                </v-btn>
              </v-card-text>
            </v-card>
            <LedgerTable
              :entries="supplierLedgerRows"
              :loading="ledgerStore.loading.supplierLedger"
              entity-type="supplier"
            />
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <div class="mt-4">
      <DiagnosticsPanel />
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountingStore } from '@/stores/accountingStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import DiagnosticsPanel from '@/components/workspace/DiagnosticsPanel.vue';
import LedgerTable from '@/components/shared/LedgerTable.vue';
import type { LedgerEntry } from '@/components/shared/LedgerTable.vue';

const route = useRoute();
const router = useRouter();

const inventoryStore = useInventoryStore();
const accountingStore = useAccountingStore();
const ledgerStore = useLedgerStore();

const section = ref((route.query.section as string) || 'inventory');
const accountingTab = ref((route.query.accountingTab as string) || 'accounts');

const movementHeaders = [
  { title: 'التاريخ', key: 'createdAt', width: 130 },
  { title: 'النوع', key: 'movementType', width: 80 },
  { title: 'السبب', key: 'reason', width: 100 },
  { title: 'المصدر', key: 'sourceType', width: 100 },
  { title: 'الكمية', key: 'quantityBase', align: 'center' as const, width: 80 },
  { title: 'قبل', key: 'stockBefore', align: 'center' as const, width: 70 },
  { title: 'بعد', key: 'stockAfter', align: 'center' as const, width: 70 },
];

const reconciliationHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'المخزن', key: 'cachedStock', align: 'center' as const, width: 80 },
  { title: 'الدفتر', key: 'ledgerStock', align: 'center' as const, width: 80 },
  { title: 'الفرق', key: 'drift', align: 'center' as const, width: 80 },
];

const accountHeaders = [
  { title: 'الكود', key: 'code', width: 90 },
  { title: 'الحساب', key: 'name' },
  { title: 'النوع', key: 'accountType', width: 100 },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: 130 },
];

const journalHeaders = [
  { title: 'رقم القيد', key: 'entryNumber', width: 120 },
  { title: 'التاريخ', key: 'entryDate', width: 130 },
  { title: 'الوصف', key: 'description' },
  { title: 'المصدر', key: 'sourceType', width: 90 },
  { title: 'المبلغ', key: 'totalAmount', align: 'end' as const, width: 120 },
];

const trialHeaders = [
  { title: 'الكود', key: 'code', width: 90 },
  { title: 'الحساب', key: 'name' },
  { title: 'مدين', key: 'debitTotal', align: 'end' as const, width: 120 },
  { title: 'دائن', key: 'creditTotal', align: 'end' as const, width: 120 },
  { title: 'الرصيد', key: 'balance', align: 'end' as const, width: 120 },
];

const customerHeaders = [
  { title: 'العميل', key: 'name' },
  { title: 'الهاتف', key: 'phone', width: 120 },
  { title: 'الرصيد', key: 'totalDebt', align: 'end' as const, width: 120 },
];

const supplierHeaders = [
  { title: 'المورد', key: 'name' },
  { title: 'الهاتف', key: 'phone', width: 120 },
  { title: 'الرصيد', key: 'currentBalance', align: 'end' as const, width: 120 },
];

const showAccountingEmptyBanner = computed(
  () =>
    !accountingStore.loading &&
    accountingStore.journalEntries.length === 0 &&
    accountingStore.accounts.length > 0
);

const customerLedgerRows = computed(
  () => ledgerStore.customerLedgerEntries as unknown as LedgerEntry[]
);
const supplierLedgerRows = computed(
  () => ledgerStore.supplierLedgerEntries as unknown as LedgerEntry[]
);

watch(section, (value) => {
  router.replace({
    query: {
      ...route.query,
      section: value,
    },
  });
});

watch(
  () => route.query.section,
  (value) => {
    if (typeof value === 'string' && value !== section.value) {
      section.value = value;
    }
  }
);

watch(accountingTab, (value) => {
  router.replace({
    query: {
      ...route.query,
      section: 'accounting',
      accountingTab: value,
    },
  });
});

watch(
  () => route.query.accountingTab,
  (value) => {
    if (typeof value === 'string' && value !== accountingTab.value) {
      accountingTab.value = value;
    }
  }
);

onMounted(() => {
  void reloadAll();
});

async function reloadAll(): Promise<void> {
  await Promise.all([
    inventoryStore.fetchDashboard(),
    inventoryStore.fetchMovements({ limit: 30, offset: 0 }),
    inventoryStore.fetchExpiryAlerts(),
    inventoryStore.reconcileStock(false),
    accountingStore.fetchAccounts(),
    accountingStore.fetchJournalEntries({ limit: 30, offset: 0 }),
    accountingStore.fetchTrialBalance(),
    accountingStore.fetchProfitLoss(),
    accountingStore.fetchBalanceSheet(),
    ledgerStore.fetchCustomers({ limit: 200, offset: 0 }),
    ledgerStore.fetchSuppliers({ limit: 200, offset: 0 }),
  ]);
}

async function runStockReconciliation(repair: boolean): Promise<void> {
  await inventoryStore.reconcileStock(repair);
}

async function onSelectCustomer(_event: Event, payload: { item: { id: number } }): Promise<void> {
  if (!payload.item.id) return;
  await ledgerStore.fetchCustomerLedger(payload.item.id, { limit: 100, offset: 0 });
}

async function onSelectSupplier(_event: Event, payload: { item: { id: number } }): Promise<void> {
  if (!payload.item.id) return;
  await ledgerStore.fetchSupplierLedger(payload.item.id, { limit: 100, offset: 0 });
}

async function reloadCustomerLedger(): Promise<void> {
  if (!ledgerStore.selectedCustomerId) return;
  await ledgerStore.fetchCustomerLedger(ledgerStore.selectedCustomerId, { limit: 100, offset: 0 });
}

async function reloadSupplierLedger(): Promise<void> {
  if (!ledgerStore.selectedSupplierId) return;
  await ledgerStore.fetchSupplierLedger(ledgerStore.selectedSupplierId, { limit: 100, offset: 0 });
}

function formatMoney(value: number): string {
  return `${(value || 0).toLocaleString('en-US')} د.ع`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  });
}

function movementLabel(value: string): string {
  if (value === 'in') return 'دخول';
  if (value === 'out') return 'خروج';
  if (value === 'adjust') return 'تعديل';
  return value;
}

function movementColor(value: string): string {
  if (value === 'in') return 'success';
  if (value === 'out') return 'error';
  if (value === 'adjust') return 'warning';
  return 'default';
}

function movementSignedPrefix(value: string): string {
  if (value === 'in') return '+';
  if (value === 'out') return '-';
  return '';
}

function movementSignedClass(value: string): string {
  if (value === 'in') return 'text-success';
  if (value === 'out') return 'text-error';
  return '';
}
</script>
