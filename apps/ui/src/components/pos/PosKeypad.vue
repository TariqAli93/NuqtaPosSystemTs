<template>
  <v-sheet class="pos-keypad" rounded="lg" elevation="0">
    <v-btn
      v-for="btn in buttons"
      :key="btn.value"
      class="pos-keypad__btn"
      :class="{
        'pos-keypad__btn--wide': btn.wide,
        'pos-keypad__btn--action': btn.action,
      }"
      size="large"
      variant="flat"
      rounded="lg"
      @click="$emit('input', btn.value)"
    >
      {{ btn.label }}
    </v-btn>
  </v-sheet>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';

interface KeypadButton {
  value: string;
  label: string;
  wide?: boolean;
  action?: boolean;
}

const buttons: KeypadButton[] = [
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '0', label: '0', wide: true },
  { value: 'clear', label: t('common.clear'), action: true },
];

defineEmits<{
  input: [value: string];
}>();
</script>
