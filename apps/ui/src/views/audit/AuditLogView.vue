<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">سجل التدقيق</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          عرض جميع أحداث النظام مع إمكانية البحث والتصفية
        </p>
      </div>
    </div>

    <!-- Statistics Cards -->
    <v-row v-if="statistics" dense class="mb-6">
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">إجمالي الأحداث</div>
          <div class="text-h6 font-weight-bold">{{ statistics.totalEvents }}</div>
        </v-card>
      </v-col>
      <v-col v-for="(count, action) in topActions" :key="action" cols="6" sm="3">
        <v-card variant="outlined" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">{{ actionLabel(String(action)) }}</div>
          <div class="text-h6 font-weight-bold">{{ count }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="filterDateFrom"
              label="من تاريخ"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="filterDateTo"
              label="إلى تاريخ"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-select
              v-model="filterAction"
              :items="actionItems"
              label="الإجراء"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3" class="d-flex align-center">
            <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="search">
              بحث
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Events Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="headers"
        :items="events"
        :loading="loading"
        density="comfortable"
        :items-per-page="25"
        no-data-text="لا توجد أحداث"
        show-expand
      >
        <template #item.action="{ item }">
          <v-chip size="x-small" variant="tonal" :color="actionColor(item.action)">
            {{ actionLabel(item.action) }}
          </v-chip>
        </template>
        <template #item.entityType="{ item }">
          <v-chip size="x-small" variant="outlined">{{ entityLabel(item.entityType) }}</v-chip>
        </template>
        <template #item.timestamp="{ item }">
          {{ formatTimestamp(item.timestamp) }}
        </template>

        <!-- Expanded row: change details -->
        <template #expanded-row="{ columns, item }">
          <td :colspan="columns.length" class="pa-4 bg-grey-lighten-5">
            <div v-if="item.changeDescription" class="mb-2">
              <strong>الوصف:</strong> {{ item.changeDescription }}
            </div>
            <div v-if="item.changedFields && Object.keys(item.changedFields).length">
              <strong class="d-block mb-1">الحقول المعدلة:</strong>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>الحقل</th>
                    <th>القيمة السابقة</th>
                    <th>القيمة الجديدة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(diff, field) in item.changedFields" :key="field">
                    <td class="font-weight-medium">{{ field }}</td>
                    <td class="text-error">{{ diff.old ?? '—' }}</td>
                    <td class="text-success">{{ diff.new ?? '—' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div
              v-if="
                !item.changeDescription &&
                (!item.changedFields || !Object.keys(item.changedFields).length)
              "
              class="text-medium-emphasis"
            >
              لا توجد تفاصيل إضافية
            </div>
          </td>
        </template>
      </v-data-table>
    </v-card>

    <!-- Cleanup section -->
    <v-card variant="outlined" class="mt-6">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="warning">mdi-broom</v-icon>
        تنظيف السجلات القديمة
      </v-card-title>
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="auto">
            <v-text-field
              v-model.number="cleanupDays"
              label="حذف أقدم من (أيام)"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              style="width: 200px"
              :min="30"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn
              color="warning"
              variant="tonal"
              prepend-icon="mdi-broom"
              :loading="cleaning"
              :disabled="cleanupDays < 30"
              @click="cleanupDialog = true"
            >
              تنظيف
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Cleanup confirmation dialog -->
    <v-dialog v-model="cleanupDialog" max-width="420">
      <v-card>
        <v-card-title>تأكيد التنظيف</v-card-title>
        <v-card-text>
          سيتم حذف جميع سجلات التدقيق الأقدم من {{ cleanupDays }} يوم. لا يمكن التراجع عن هذا.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cleanupDialog = false">إلغاء</v-btn>
          <v-btn color="warning" :loading="cleaning" @click="executeCleanup">تنظيف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { auditClient, type AuditEvent, type AuditStatistics } from '../../ipc/auditClient';
import { notifyError, notifySuccess } from '@/utils/notify';

const events = ref<AuditEvent[]>([]);
const statistics = ref<AuditStatistics | null>(null);
const loading = ref(false);
const cleaning = ref(false);
const cleanupDays = ref(90);
const cleanupDialog = ref(false);

const filterDateFrom = ref<string | null>(null);
const filterDateTo = ref<string | null>(null);
const filterAction = ref<string | null>(null);

const actionItems = [
  { title: 'إنشاء', value: 'create' },
  { title: 'تعديل', value: 'update' },
  { title: 'حذف', value: 'delete' },
  { title: 'بيع', value: 'sale' },
  { title: 'شراء', value: 'purchase' },
  { title: 'دفعة', value: 'payment' },
  { title: 'ترحيل', value: 'post' },
  { title: 'عكس', value: 'reverse' },
  { title: 'تسوية', value: 'adjustment' },
];

const headers = [
  { title: '#', key: 'id', width: '70px' },
  { title: 'الإجراء', key: 'action', width: '100px' },
  { title: 'الكيان', key: 'entityType', width: '110px' },
  { title: 'معرف الكيان', key: 'entityId', width: '100px' },
  { title: 'التاريخ', key: 'timestamp', width: '180px' },
  { title: '', key: 'data-table-expand' },
];

/** Show top 3 actions from statistics */
const topActions = computed(() => {
  if (!statistics.value?.byAction) return {};
  const sorted = Object.entries(statistics.value.byAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  return Object.fromEntries(sorted);
});

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
    sale: 'بيع',
    purchase: 'شراء',
    payment: 'دفعة',
    post: 'ترحيل',
    reverse: 'عكس',
    adjustment: 'تسوية',
    login: 'دخول',
    logout: 'خروج',
  };
  return map[action] ?? action;
}

function actionColor(action: string): string {
  const map: Record<string, string> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    sale: 'primary',
    purchase: 'warning',
    payment: 'teal',
    reverse: 'deep-orange',
  };
  return map[action] ?? 'grey';
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    sale: 'فاتورة',
    product: 'منتج',
    customer: 'عميل',
    supplier: 'مورد',
    purchase: 'مشتريات',
    journal_entry: 'قيد',
    posting_batch: 'دفعة ترحيل',
    user: 'مستخدم',
    category: 'تصنيف',
    setting: 'إعداد',
  };
  return map[type] ?? type;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('ar-IQ', { numberingSystem: 'latn' });
}

async function search() {
  loading.value = true;

  let result;
  if (filterAction.value) {
    result = await auditClient.getByAction(filterAction.value, 100);
  } else if (filterDateFrom.value && filterDateTo.value) {
    result = await auditClient.getByDateRange(filterDateFrom.value, filterDateTo.value, 100);
  } else if (filterDateFrom.value) {
    // Search from date to today
    const today = new Date().toISOString().split('T')[0];
    result = await auditClient.getByDateRange(filterDateFrom.value, today, 100);
  } else {
    // Default: last 7 days
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    result = await auditClient.getByDateRange(from, to, 100);
  }

  loading.value = false;

  if (result.ok) {
    events.value = result.data;
  } else {
    notifyError(result.error.message || 'فشل تحميل سجل التدقيق');
  }
}

async function loadStatistics() {
  const result = await auditClient.getStatistics({
    startDate: filterDateFrom.value || undefined,
    endDate: filterDateTo.value || undefined,
  });
  if (result.ok) {
    statistics.value = result.data;
  }
}

async function executeCleanup() {
  cleaning.value = true;
  cleanupDialog.value = false;

  const result = await auditClient.cleanup(cleanupDays.value);
  cleaning.value = false;

  if (result.ok) {
    // Reload data
    await Promise.all([search(), loadStatistics()]);
    notifySuccess('تم تنظيف السجلات بنجاح');
  } else {
    notifyError(result.error.message || 'فشل التنظيف');
  }
}

onMounted(async () => {
  await Promise.all([search(), loadStatistics()]);
});
</script>
