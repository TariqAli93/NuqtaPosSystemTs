<template>
  <v-text-field
    :model-value="displayValue"
    :label="label"
    :disabled="disabled"
    :rules="rules"
    :error-messages="errorMessages"
    :density="density"
    :variant="variant"
    :hide-details="hideDetails"
    dir="ltr"
    class="money-input"
    inputmode="numeric"
    suffix="د.ع"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label?: string;
    disabled?: boolean;
    rules?: ((v: string) => true | string)[];
    errorMessages?: string | string[];
    density?: 'default' | 'comfortable' | 'compact';
    variant?: 'outlined' | 'filled' | 'underlined' | 'solo' | 'plain';
    hideDetails?: boolean | 'auto';
  }>(),
  {
    label: '',
    disabled: false,
    rules: () => [],
    errorMessages: '',
    density: 'compact',
    variant: 'outlined',
    hideDetails: 'auto',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const rawText = ref(formatDisplay(props.modelValue));

function formatDisplay(val: number): string {
  if (!val && val !== 0) return '';
  return val.toLocaleString('en-US');
}

function parseInteger(text: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

const displayValue = computed(() => rawText.value);

watch(
  () => props.modelValue,
  (newVal) => {
    rawText.value = formatDisplay(newVal);
  }
);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const cleaned = target.value.replace(/[^0-9,]/g, '');
  const intVal = parseInteger(cleaned);
  rawText.value = formatDisplay(intVal);
  emit('update:modelValue', intVal);
}

function onBlur() {
  rawText.value = formatDisplay(props.modelValue);
}
</script>

<style scoped>
.money-input :deep(input) {
  text-align: left;
  font-variant-numeric: tabular-nums;
}
</style>
