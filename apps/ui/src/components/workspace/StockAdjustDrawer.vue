<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="close">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>تعديل مخزون</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close(false)" />
      </v-card-title>
      <v-card-text>
        <v-sheet
          v-if="product"
          class="d-flex align-center ga-2 px-3 py-2 mb-3 text-info"
          color="transparent"
        >
          <v-icon size="18">mdi-information-outline</v-icon>
          <span>المنتج: {{ product.name }} | المخزون الحالي: {{ product.stock || 0 }}</span>
        </v-sheet>

        <v-row>
          <v-col cols="6">
            <v-select
              v-model="reason"
              :items="reasonItems"
              item-title="title"
              item-value="value"
              label="السبب"
              variant="outlined"
            />
          </v-col>

          <v-col cols="6">
            <v-text-field
              v-model.number="quantityBase"
              label="الكمية (+ زيادة / - نقصان)"
              type="number"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <UnitSelector :units="units || []" v-model="selectedUnit" class="my-2" />

        <v-textarea v-model="notes" label="ملاحظات" rows="2" variant="outlined" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close(false)">إلغاء</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">حفظ</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { Product } from '@nuqtaplus/core';
import UnitSelector from '@/components/shared/UnitSelector.vue';
import type { ProductUnitInput } from '@/types/workspace';
import { useProductWorkspaceStore } from '@/stores/productWorkspaceStore';

const props = defineProps<{
  modelValue: boolean;
  product: Product | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [
    payload: {
      productId: number;
      quantityBase: number;
      reason: 'manual' | 'damage' | 'opening';
      unitName?: string;
      notes?: string;
    },
  ];
}>();

const reason = ref<'manual' | 'damage' | 'opening'>('manual');
const quantityBase = ref(0);
const unitName = ref('');
const notes = ref('');
const selectedUnit = ref<number | undefined>(undefined);
const units = ref<ProductUnitInput[]>([]);

const productWorkspaceStore = useProductWorkspaceStore();

const reasonItems = [
  { title: 'تعديل يدوي', value: 'manual' },
  { title: 'تالف', value: 'damage' },
  { title: 'رصيد افتتاحي', value: 'opening' },
];

watch(
  () => props.modelValue,
  (opened) => {
    if (!opened) return;
    reason.value = 'manual';
    quantityBase.value = 0;
    unitName.value = props.product?.unit || '';
    notes.value = '';
    selectedUnit.value = undefined;
    if (props.product?.id) {
      productWorkspaceStore.fetchUnits(props.product.id).then((result) => {
        if (result.ok) {
          units.value = result.data;
        }
      });
    }
  }
);

function close(value: boolean): void {
  emit('update:modelValue', value);
}

function submit(): void {
  if (!props.product?.id) return;
  if (!Number.isFinite(quantityBase.value) || quantityBase.value === 0) return;
  emit('submit', {
    productId: props.product.id,
    quantityBase: quantityBase.value,
    reason: reason.value,
    unitName: unitName.value || undefined,
    notes: notes.value || undefined,
  });
}

onMounted(async () => {
  if (props.product?.id) {
    const result = await productWorkspaceStore.fetchUnits(props.product.id);
    if (result.ok) {
      units.value = result.data;
    }
  }
});
</script>
