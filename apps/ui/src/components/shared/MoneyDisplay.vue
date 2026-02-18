<template>
  <span class="money-display" :class="[sizeClass, colorClass]">
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    amount: number;
    currency?: string;
    size?: 'sm' | 'md' | 'lg';
    colored?: boolean;
  }>(),
  {
    currency: 'IQD',
    size: 'md',
    colored: false,
  }
);

const formatted = computed(() => {
  const val = props.amount ?? 0;
  const num = val.toLocaleString('en-US');
  return props.currency === 'IQD' ? `${num} د.ع` : `${num} ${props.currency}`;
});

const sizeClass = computed(
  () =>
    ({
      sm: 'text-caption',
      md: 'text-body-2',
      lg: 'text-h6',
    })[props.size]
);

const colorClass = computed(() => {
  if (!props.colored) return '';
  if (props.amount > 0) return 'text-success';
  if (props.amount < 0) return 'text-error';
  return '';
});
</script>

<style scoped>
.money-display {
  font-variant-numeric: tabular-nums;
  direction: ltr;
  unicode-bidi: embed;
}
</style>
