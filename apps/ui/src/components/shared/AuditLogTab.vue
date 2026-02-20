<template>
  <v-card flat>
    <v-card-title v-if="title" class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
      <v-icon size="20">mdi-history</v-icon>
      {{ title }}
    </v-card-title>

    <v-card-text v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </v-card-text>

    <v-card-text v-else-if="events.length === 0" class="text-center py-8 text-medium-emphasis">
      <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-shield-check-outline</v-icon>
      <div>لا توجد سجلات تدقيق</div>
    </v-card-text>

    <template v-else>
      <v-timeline density="compact" side="end" class="pa-4">
        <v-timeline-item
          v-for="event in events"
          :key="event.id"
          :dot-color="actionColor(event.action)"
          size="small"
        >
          <div class="d-flex align-center ga-2 mb-1">
            <v-chip size="x-small" :color="actionColor(event.action)" variant="tonal">
              {{ actionLabel(event.action) }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">
              {{ formatDateTime(event.createdAt) }}
            </span>
            <span v-if="event.userId" class="text-caption text-medium-emphasis">
              — مستخدم #{{ event.userId }}
            </span>
          </div>

          <!-- Changes diff -->
          <v-card
            v-if="event.changes && Object.keys(event.changes).length > 0"
            variant="outlined"
            density="compact"
            class="mt-1"
          >
            <v-table density="compact">
              <thead>
                <tr>
                  <th style="width: 30%">الحقل</th>
                  <th style="width: 35%">القديم</th>
                  <th style="width: 35%">الجديد</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(change, field) in event.changes" :key="field as string">
                  <td class="font-weight-medium">{{ fieldLabel(field as string) }}</td>
                  <td class="text-error" style="direction: ltr; unicode-bidi: embed">
                    {{ formatChangeValue(change.old) }}
                  </td>
                  <td class="text-success" style="direction: ltr; unicode-bidi: embed">
                    {{ formatChangeValue(change.new) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>

          <!-- Metadata -->
          <div v-if="event.metadata" class="text-caption text-medium-emphasis mt-1">
            <span v-for="(val, key) in event.metadata" :key="key as string" class="me-3">
              {{ key }}: {{ val }}
            </span>
          </div>
        </v-timeline-item>
      </v-timeline>
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { auditClient, type AuditEvent } from '../../ipc/auditClient';

const props = withDefaults(
  defineProps<{
    entityType: string;
    entityId: number;
    title?: string;
    limit?: number;
  }>(),
  {
    title: 'سجل التدقيق',
    limit: 50,
  }
);

const events = ref<AuditEvent[]>([]);
const loading = ref(false);

async function loadAuditTrail() {
  if (!props.entityId) return;
  loading.value = true;
  const result = await auditClient.getTrail(props.entityType, props.entityId, props.limit);
  if (result.ok) {
    events.value = result.data ?? [];
  }
  loading.value = false;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  cancel: 'إلغاء',
  refund: 'مرتجع',
  post: 'ترحيل',
  reverse: 'عكس',
  adjust: 'تعديل مخزون',
  lock: 'قفل',
  unlock: 'فتح قفل',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  cancel: 'warning',
  refund: 'warning',
  post: 'primary',
  reverse: 'deep-orange',
  adjust: 'teal',
  lock: 'grey-darken-1',
  unlock: 'grey',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'grey';
}

function fieldLabel(field: string): string {
  // Common field translations
  const labels: Record<string, string> = {
    name: 'الاسم',
    stock: 'المخزون',
    costPrice: 'سعر التكلفة',
    sellingPrice: 'سعر البيع',
    status: 'الحالة',
    total: 'الإجمالي',
    paidAmount: 'المبلغ المدفوع',
    discount: 'الخصم',
    quantity: 'الكمية',
    notes: 'ملاحظات',
  };
  return labels[field] ?? field;
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('ar-IQ', { numberingSystem: 'latn' });
}

onMounted(() => {
  void loadAuditTrail();
});

watch(
  () => [props.entityType, props.entityId],
  () => {
    void loadAuditTrail();
  }
);
</script>
