<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ©</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø³ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø¯ÙØ¹Ø§Øª Ù…Ø±Ø­Ù‘Ù„Ø© Ø­Ø³Ø¨ Ø§Ù„ÙØªØ±Ø©
          Ø§Ù„Ø²Ù…Ù†ÙŠØ©
        </p>
      </div>
    </div>

    <!-- Error alert -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Success alert -->
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="successMessage = null"
    >
      {{ successMessage }}
    </v-alert>

    <!-- Post New Batch Card -->
    <v-card class="mb-6" variant="outlined">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-send-check</v-icon>
        ØªØ±Ø­ÙŠÙ„ ÙØªØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-select
              v-model="postForm.periodType"
              :items="[
                { title: 'ÙŠÙˆÙ…ÙŠ', value: 'day' },
                { title: 'Ø´Ù‡Ø±ÙŠ', value: 'month' },
                { title: 'Ø³Ù†ÙˆÙŠ', value: 'year' },
              ]"
              label="Ù†ÙˆØ¹ Ø§Ù„ÙØªØ±Ø©"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="postForm.periodStart"
              label="Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ÙØªØ±Ø©"
              type="date"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="postForm.periodEnd"
              label="Ù†Ù‡Ø§ÙŠØ© Ø§Ù„ÙØªØ±Ø©"
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
              ØªØ±Ø­ÙŠÙ„
            </v-btn>
          </v-col>
        </v-row>
        <v-text-field
          v-model="postForm.notes"
          label="Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)"
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
        Ø³Ø¬Ù„ Ø§Ù„Ø¯ÙØ¹Ø§Øª Ø§Ù„Ù…Ø±Ø­Ù‘Ù„Ø©
        <v-spacer />
        <v-btn variant="text" icon size="small" :loading="loadingBatches" @click="loadBatches">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="batchHeaders"
        :items="batches"
        :loading="loadingBatches"
        :items-per-page="20"
        density="comfortable"
        class="elevation-0"
        no-data-text="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙØ¹Ø§Øª Ù…Ø±Ø­Ù‘Ù„Ø©"
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
            <v-btn
              v-if="item.status !== 'locked'"
              variant="text"
              size="small"
              color="warning"
              icon
              :loading="lockingId === item.id"
              @click="toggleLock(item)"
            >
              <v-icon size="18">mdi-lock-outline</v-icon>
            </v-btn>
            <v-btn
              v-else
              variant="text"
              size="small"
              color="info"
              icon
              :loading="lockingId === item.id"
              @click="toggleLock(item)"
            >
              <v-icon size="18">mdi-lock-open-outline</v-icon>
            </v-btn>

            <v-btn
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
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Reverse confirmation dialog -->
    <v-dialog v-model="reverseDialog" max-width="420">
      <v-card>
        <v-card-title>ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¹ÙƒØ³</v-card-title>
        <v-card-text>
          Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø¹ÙƒØ³ Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙØ¹Ø©ØŸ Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‚ÙŠÙˆØ¯
          Ø¹ÙƒØ³ÙŠØ© Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù‚ÙŠÙˆØ¯ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙØ¹Ø©.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="reverseDialog = false">Ø¥Ù„ØºØ§Ø¡</v-btn>
          <v-btn color="error" @click="executeReverse" :loading="reversingId !== null">
            Ø¹ÙƒØ³
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { postingClient, type PostingBatch } from '../../ipc/postingClient';

const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const posting = ref(false);
const loadingBatches = ref(false);
const batches = ref<PostingBatch[]>([]);
const reverseDialog = ref(false);
const reversingId = ref<number | null>(null);
const lockingId = ref<number | null>(null);
const selectedBatch = ref<PostingBatch | null>(null);

const postForm = reactive({
  periodType: 'month' as 'day' | 'month' | 'year',
  periodStart: '',
  periodEnd: '',
  notes: '',
});

const batchHeaders = [
  { title: '#', key: 'id', width: '60px' },
  { title: 'Ù†ÙˆØ¹ Ø§Ù„ÙØªØ±Ø©', key: 'periodType' },
  { title: 'Ù…Ù†', key: 'periodStart' },
  { title: 'Ø¥Ù„Ù‰', key: 'periodEnd' },
  { title: 'Ø¹Ø¯Ø¯ Ø§Ù„Ù‚ÙŠÙˆØ¯', key: 'entriesCount' },
  { title: 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', key: 'totalAmount' },
  { title: 'ØªØ§Ø±ÙŠØ® Ø§Ù„ØªØ±Ø­ÙŠÙ„', key: 'postedAt' },
  { title: 'Ø§Ù„Ø­Ø§Ù„Ø©', key: 'status', width: '100px' },
  { title: '', key: 'actions', sortable: false, width: '100px' },
];

function periodLabel(type: string): string {
  if (type === 'day') return 'ÙŠÙˆÙ…ÙŠ';
  if (type === 'month') return 'Ø´Ù‡Ø±ÙŠ';
  return 'Ø³Ù†ÙˆÙŠ';
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

async function postPeriod() {
  errorMessage.value = null;
  successMessage.value = null;
  posting.value = true;

  const result = await postingClient.postPeriod({
    periodType: postForm.periodType,
    periodStart: postForm.periodStart,
    periodEnd: postForm.periodEnd,
    notes: postForm.notes || undefined,
  });

  posting.value = false;

  if (result.ok) {
    successMessage.value = `ØªÙ… ØªØ±Ø­ÙŠÙ„ ${result.data.entriesCount ?? 0} Ù‚ÙŠØ¯ Ø¨Ù†Ø¬Ø§Ø­`;
    postForm.notes = '';
    await loadBatches();
  } else {
    errorMessage.value = result.error.message || 'ÙØ´Ù„ Ø§Ù„ØªØ±Ø­ÙŠÙ„';
  }
}

async function loadBatches() {
  loadingBatches.value = true;
  const result = await postingClient.getBatches();
  loadingBatches.value = false;

  if (result.ok) {
    batches.value = result.data.items || [];
  } else {
    errorMessage.value = result.error.message || 'ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø§Øª';
  }
}

function confirmReverse(batch: PostingBatch) {
  if (batch.status === 'locked') return; // guard: locked batches cannot be reversed
  selectedBatch.value = batch;
  reverseDialog.value = true;
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

async function toggleLock(batch: PostingBatch) {
  lockingId.value = batch.id;
  errorMessage.value = null;

  try {
    if (batch.status === 'locked') {
      const result = await postingClient.unlockBatch(batch.id);
      if (result.ok) {
        batch.status = 'posted';
      } else {
        errorMessage.value = result.error.message || 'فشل فتح القفل';
      }
    } else {
      const result = await postingClient.lockBatch(batch.id);
      if (result.ok) {
        batch.status = 'locked';
      } else {
        errorMessage.value = result.error.message || 'فشل القفل';
      }
    }
  } finally {
    lockingId.value = null;
  }
}

async function executeReverse() {
  if (!selectedBatch.value?.id) return;

  reversingId.value = selectedBatch.value.id;
  reverseDialog.value = false;
  errorMessage.value = null;
  successMessage.value = null;

  const result = await postingClient.reverseBatch(selectedBatch.value.id);
  reversingId.value = null;

  if (result.ok) {
    successMessage.value = 'ØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­';
    await loadBatches();
  } else {
    errorMessage.value = result.error.message || 'ÙØ´Ù„ Ø¹ÙƒØ³ Ø§Ù„Ø¯ÙØ¹Ø©';
  }
}

onMounted(() => {
  void loadBatches();
});
</script>
