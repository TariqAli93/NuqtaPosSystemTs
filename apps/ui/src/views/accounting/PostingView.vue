<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">ترحيل القيود المحاسبية</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          ترحيل القيود المسودة إلى دفعات مرحّلة حسب الفترة الزمنية
        </p>
      </div>
    </div>

    <!-- Post New Batch Card -->
    <v-card class="mb-6" variant="outlined">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-send-check</v-icon>
        ترحيل فترة جديدة
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-select
              v-model="postForm.periodType"
              :items="periodTypeItems"
              label="نوع الفترة"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="postForm.periodStart"
              label="بداية الفترة"
              type="date"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="postForm.periodEnd"
              label="نهاية الفترة"
              type="date"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-center">
            <v-btn
              color="primary"
              :loading="posting"
              :disabled="!postForm.periodStart || !postForm.periodEnd"
              prepend-icon="mdi-send-check"
              @click="postPeriod"
            >
              ترحيل
            </v-btn>
          </v-col>
        </v-row>
        <v-text-field
          v-model="postForm.notes"
          label="ملاحظات (اختياري)"
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />
      </v-card-text>
    </v-card>

    <!-- Batches Table -->
    <v-card variant="outlined">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-history</v-icon>
        سجل الدفعات المرحّلة
        <v-spacer />
        <v-btn variant="text" icon size="small" :loading="loadingBatches" @click="loadBatches">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Batch filter row -->
      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" sm="3">
            <v-select
              v-model="filterPeriodType"
              :items="[{ title: 'الكل', value: '' }, ...periodTypeItems]"
              label="نوع الفترة"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="loadBatches"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="filterDateFrom"
              label="من تاريخ"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="loadBatches"
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
              @update:model-value="loadBatches"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-data-table
        :headers="batchHeaders"
        :items="batches"
        :loading="loadingBatches"
        :items-per-page="20"
        density="comfortable"
        class="elevation-0"
        no-data-text="لا توجد دفعات مرحّلة"
      >
        <template #item.periodType="{ item }">
          <v-chip size="small" variant="tonal" :color="periodColor(item.periodType)">
            {{ periodLabel(item.periodType) }}
          </v-chip>
        </template>

        <template #item.postedAt="{ item }">
          {{ formatDate(item.postedAt) }}
        </template>

        <template #item.status="{ item }">
          <v-chip size="small" variant="tonal" :color="batchStatusColor(item.status)">
            {{ batchStatusLabel(item.status) }}
          </v-chip>
        </template>

        <template #item.totalAmount="{ item }">
          {{ formatMoney(item.totalAmount) }}
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <v-tooltip v-if="item.status === 'locked'" location="top">
              <template #activator="{ props: tp }">
                <v-btn
                  v-bind="tp"
                  variant="text"
                  size="small"
                  color="grey"
                  icon
                  :loading="unlockingId === item.id"
                  @click="confirmUnlock(item)"
                >
                  <v-icon size="18">mdi-lock-open-outline</v-icon>
                </v-btn>
              </template>
              <span>فتح القفل</span>
            </v-tooltip>
            <v-tooltip v-else location="top">
              <template #activator="{ props: tp }">
                <v-btn
                  v-bind="tp"
                  variant="text"
                  size="small"
                  color="warning"
                  icon
                  :loading="lockingId === item.id"
                  @click="confirmLock(item)"
                >
                  <v-icon size="18">mdi-lock-outline</v-icon>
                </v-btn>
              </template>
              <span>قفل الدفعة</span>
            </v-tooltip>

            <v-tooltip location="top">
              <template #activator="{ props: tp }">
                <v-btn
                  v-bind="tp"
                  variant="text"
                  size="small"
                  color="error"
                  icon
                  :loading="reversingId === item.id"
                  :disabled="item.status === 'locked'"
                  @click="confirmReverse(item)"
                >
                  <v-icon size="18">mdi-undo</v-icon>
                </v-btn>
              </template>
              <span>عكس الدفعة</span>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Reverse confirmation dialog -->
    <v-dialog v-model="reverseDialog" max-width="420">
      <v-card>
        <v-card-title>تأكيد العكس</v-card-title>
        <v-card-text>
          هل أنت متأكد من عكس هذه الدفعة؟ سيتم إنشاء قيود عكسية لجميع القيود في هذه الدفعة.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="reverseDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="executeReverse" :loading="reversingId !== null">عكس</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Lock confirmation dialog -->
    <v-dialog v-model="lockDialog" max-width="420">
      <v-card>
        <v-card-title>تأكيد القفل</v-card-title>
        <v-card-text>
          هل أنت متأكد من قفل هذه الدفعة؟ بعد القفل لن يمكن عكس أو تعديل أي قيد فيها.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="lockDialog = false">إلغاء</v-btn>
          <v-btn color="warning" @click="executeLock" :loading="lockingId !== null">قفل</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Unlock confirmation dialog -->
    <v-dialog v-model="unlockDialog" max-width="420">
      <v-card>
        <v-card-title>تأكيد فتح القفل</v-card-title>
        <v-card-text>
          هل أنت متأكد من فتح قفل هذه الدفعة؟ سيسمح ذلك بعكس القيود المنتمية لها.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="unlockDialog = false">إلغاء</v-btn>
          <v-btn color="primary" @click="executeUnlock" :loading="unlockingId !== null">
            فتح القفل
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { postingClient, type PostingBatch } from '../../ipc/postingClient';
import { notifyError, notifySuccess } from '@/utils/notify';

const posting = ref(false);
const loadingBatches = ref(false);
const batches = ref<PostingBatch[]>([]);

const reverseDialog = ref(false);
const lockDialog = ref(false);
const unlockDialog = ref(false);

const reversingId = ref<number | null>(null);
const lockingId = ref<number | null>(null);
const unlockingId = ref<number | null>(null);
const selectedBatch = ref<PostingBatch | null>(null);

const filterPeriodType = ref('');
const filterDateFrom = ref<string | null>(null);
const filterDateTo = ref<string | null>(null);

const periodTypeItems = [
  { title: 'يومي', value: 'day' },
  { title: 'شهري', value: 'month' },
  { title: 'سنوي', value: 'year' },
];

const postForm = reactive({
  periodType: 'month' as 'day' | 'month' | 'year',
  periodStart: '',
  periodEnd: '',
  notes: '',
});

const batchHeaders = [
  { title: '#', key: 'id', width: '60px' },
  { title: 'نوع الفترة', key: 'periodType' },
  { title: 'من', key: 'periodStart' },
  { title: 'إلى', key: 'periodEnd' },
  { title: 'عدد القيود', key: 'entriesCount' },
  { title: 'المبلغ الإجمالي', key: 'totalAmount' },
  { title: 'تاريخ الترحيل', key: 'postedAt' },
  { title: 'الحالة', key: 'status', width: '100px' },
  { title: '', key: 'actions', sortable: false, width: '120px' },
];

function periodLabel(type: string): string {
  if (type === 'day') return 'يومي';
  if (type === 'month') return 'شهري';
  return 'سنوي';
}

function periodColor(type: string): string {
  if (type === 'day') return 'info';
  if (type === 'month') return 'primary';
  return 'warning';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-IQ', { numberingSystem: 'latn' });
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ar-IQ', { numberingSystem: 'latn' }).format(amount);
}

function batchStatusLabel(status?: string): string {
  if (status === 'locked') return 'مقفل';
  if (status === 'posted') return 'مرحّل';
  return 'مسودة';
}

function batchStatusColor(status?: string): string {
  if (status === 'locked') return 'error';
  if (status === 'posted') return 'success';
  return 'grey';
}

async function postPeriod() {
  posting.value = true;

  const result = await postingClient.postPeriod({
    periodType: postForm.periodType,
    periodStart: postForm.periodStart,
    periodEnd: postForm.periodEnd,
    notes: postForm.notes || undefined,
  });

  posting.value = false;

  if (result.ok) {
    notifySuccess(`تم ترحيل ${result.data.entriesCount ?? 0} قيد بنجاح`);
    postForm.notes = '';
    await loadBatches();
  } else {
    notifyError(result.error.message || 'فشل الترحيل');
  }
}

async function loadBatches() {
  loadingBatches.value = true;
  const result = await postingClient.getBatches({
    periodType: filterPeriodType.value || undefined,
    dateFrom: filterDateFrom.value || undefined,
    dateTo: filterDateTo.value || undefined,
  });
  loadingBatches.value = false;

  if (result.ok) {
    batches.value = result.data.items || [];
  } else {
    notifyError(result.error.message || 'فشل تحميل الدفعات');
  }
}

function confirmReverse(batch: PostingBatch) {
  if (batch.status === 'locked') return;
  selectedBatch.value = batch;
  reverseDialog.value = true;
}

function confirmLock(batch: PostingBatch) {
  if (batch.status === 'locked') return;
  selectedBatch.value = batch;
  lockDialog.value = true;
}

function confirmUnlock(batch: PostingBatch) {
  if (batch.status !== 'locked') return;
  selectedBatch.value = batch;
  unlockDialog.value = true;
}

async function executeLock() {
  if (!selectedBatch.value?.id) return;
  lockingId.value = selectedBatch.value.id;
  lockDialog.value = false;

  const result = await postingClient.lockBatch(selectedBatch.value.id);
  lockingId.value = null;

  if (result.ok) {
    notifySuccess('تم قفل الدفعة بنجاح');
    await loadBatches();
  } else {
    notifyError(result.error.message || 'فشل القفل');
  }
}

async function executeUnlock() {
  if (!selectedBatch.value?.id) return;
  unlockingId.value = selectedBatch.value.id;
  unlockDialog.value = false;

  const result = await postingClient.unlockBatch(selectedBatch.value.id);
  unlockingId.value = null;

  if (result.ok) {
    notifySuccess('تم فتح قفل الدفعة بنجاح');
    await loadBatches();
  } else {
    notifyError(result.error.message || 'فشل فتح القفل');
  }
}

async function executeReverse() {
  if (!selectedBatch.value?.id) return;
  reversingId.value = selectedBatch.value.id;
  reverseDialog.value = false;

  const result = await postingClient.reverseBatch(selectedBatch.value.id);
  reversingId.value = null;

  if (result.ok) {
    notifySuccess('تم عكس الدفعة بنجاح');
    await loadBatches();
  } else {
    notifyError(result.error.message || 'فشل عكس الدفعة');
  }
}

onMounted(() => {
  void loadBatches();
});
</script>
