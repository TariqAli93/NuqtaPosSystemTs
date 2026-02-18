<template>
  <v-select
    :model-value="modelValue"
    :items="unitItems"
    :label="label"
    :disabled="disabled"
    :density="density"
    :variant="variant"
    item-title="text"
    item-value="id"
    :hide-details="hideDetails"
    @update:model-value="onUnitChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductUnit } from '@nuqtaplus/core';

const props = withDefaults(
  defineProps<{
    modelValue: number | undefined;
    units: ProductUnit[];
    label?: string;
    disabled?: boolean;
    density?: 'default' | 'comfortable' | 'compact';
    variant?: 'outlined' | 'filled' | 'underlined' | 'solo' | 'plain';
    hideDetails?: boolean | 'auto';
  }>(),
  {
    label: 'الوحدة',
    disabled: false,
    density: 'compact',
    variant: 'outlined',
    hideDetails: 'auto',
  }
);

const emit = defineEmits<{
  'update:modelValue': [unitId: number];
  'update:factor': [factor: number];
  'update:price': [price: number | null];
}>();

const unitItems = computed(() =>
  props.units.map((u) => ({
    id: u.id!,
    text: `${u.unitName} (${u.factorToBase}x)`,
    factor: u.factorToBase,
    price: u.sellingPrice,
  }))
);

function onUnitChange(unitId: number) {
  const unit = unitItems.value.find((u) => u.id === unitId);
  emit('update:modelValue', unitId);
  if (unit) {
    emit('update:factor', unit.factor);
    emit('update:price', unit.price ?? null);
  }
}
</script>
