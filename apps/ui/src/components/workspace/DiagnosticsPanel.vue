<template>
  <v-card rounded="lg" elevation="1">
    <v-card-title class="d-flex align-center">
      <span class="text-subtitle-1 font-weight-bold">لوحة التشخيص</span>
      <v-spacer />
      <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="load">
        تحديث
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">
        {{ error }}
      </v-alert>

      <v-alert
        v-for="(warning, idx) in diagnostics?.warnings || []"
        :key="`diag-warning-${idx}`"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-2"
      >
        {{ warning }}
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="diagnostics?.tables || []"
        :loading="loading"
        density="compact"
        :items-per-page="-1"
        hide-default-footer
      >
        <template #item.rowCount="{ item }">
          <v-chip
            size="x-small"
            variant="tonal"
            :color="item.rowCount > 0 ? 'success' : 'warning'"
          >
            {{ item.rowCount }}
          </v-chip>
        </template>
        <template #item.lastCreatedAt="{ item }">
          {{ formatDate(item.lastCreatedAt) }}
        </template>
      </v-data-table>

      <v-alert type="info" variant="tonal" class="mt-3" density="compact">
        هذه اللوحة تعرض حقيقة الربط من قاعدة البيانات: عدد السجلات في الجداول وتاريخ آخر إدخال.
      </v-alert>

      <div v-if="isDev" class="mt-3 d-flex flex-wrap align-center ga-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-flask"
          :loading="actionLoading"
          @click="runDevAction('saleCredit')"
        >
          إنشاء معاملة اختبار (Dev)
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-cash"
          :loading="actionLoading"
          @click="runDevAction('saleCash')"
        >
          Cash Sale (Dev)
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-truck-delivery"
          :loading="actionLoading"
          @click="runDevAction('purchase')"
        >
          Purchase (Dev)
        </v-btn>
        <span class="text-caption text-medium-emphasis">
          هذا الخيار متاح في بيئة التطوير فقط.
        </span>
      </div>

      <v-alert v-if="actionMessage" type="success" variant="tonal" class="mt-2" density="compact">
        {{ actionMessage }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { diagnosticsClient } from '@/ipc';
import type { FinanceInventoryDiagnostics } from '@/types/workspace';

const diagnostics = ref<FinanceInventoryDiagnostics | null>(null);
const loading = ref(false);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const actionMessage = ref('');
const isDev = Boolean((import.meta as any).env?.DEV);

const headers = [
  { title: 'الجدول', key: 'table' },
  { title: 'عدد السجلات', key: 'rowCount', align: 'center' as const, width: 110 },
  { title: 'آخر إدخال', key: 'lastCreatedAt', width: 170 },
];

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  const result = await diagnosticsClient.getFinanceInventoryStatus();
  if (result.ok) {
    diagnostics.value = result.data;
  } else {
    error.value = result.error.message;
  }
  loading.value = false;
}

async function runDevAction(kind: 'saleCash' | 'saleCredit' | 'purchase'): Promise<void> {
  if (!isDev) return;
  actionLoading.value = true;
  actionMessage.value = '';
  error.value = null;

  const result =
    kind === 'saleCash'
      ? await diagnosticsClient.createTestSaleCash()
      : kind === 'saleCredit'
        ? await diagnosticsClient.createTestSaleCredit()
        : await diagnosticsClient.createTestPurchase();

  if (result.ok) {
    actionMessage.value = result.data.message;
    await load();
  } else {
    error.value = result.error.message;
  }
  actionLoading.value = false;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  });
}

onMounted(() => {
  void load();
});
</script>
