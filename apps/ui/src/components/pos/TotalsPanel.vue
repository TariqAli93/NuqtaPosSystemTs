<template>
  <v-sheet class="px-4 py-3">
    <v-list density="comfortable" bg-color="transparent">
      <v-list-item class="px-0" min-height="32">
        <template #title>
          <span class="text-body-2 text-medium-emphasis">{{ t('sales.subtotal') }}</span>
        </template>
        <template #append>
          <span class="text-body-2 font-weight-medium text-no-wrap">{{
            formatPrice(subtotal)
          }}</span>
        </template>
      </v-list-item>

      <v-list-item v-if="discount > 0" class="px-0" min-height="32">
        <template #title>
          <span class="text-body-2 text-medium-emphasis">{{ t('sales.discount') }}</span>
        </template>
        <template #append>
          <span class="text-body-2 font-weight-medium text-no-wrap"
            >-{{ formatPrice(discount) }}</span
          >
        </template>
      </v-list-item>

      <v-list-item v-if="tax > 0" class="px-0" min-height="32">
        <template #title>
          <span class="text-body-2 text-medium-emphasis">{{ t('sales.tax') }}</span>
        </template>
        <template #append>
          <span class="text-body-2 font-weight-medium text-no-wrap">{{ formatPrice(tax) }}</span>
        </template>
      </v-list-item>
    </v-list>

    <v-divider class="my-3" />

    <v-list density="comfortable" bg-color="transparent">
      <v-list-item class="px-0" min-height="44">
        <template #title>
          <span class="text-subtitle-1 font-weight-bold">{{ t('common.total') }}</span>
        </template>
        <template #append>
          <span class="text-h6 font-weight-bold text-primary text-no-wrap">
            {{ formatPrice(total) }}
          </span>
        </template>
      </v-list-item>
    </v-list>
  </v-sheet>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';

interface Props {
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
}

withDefaults(defineProps<Props>(), {
  discount: 0,
  tax: 0,
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
    numberingSystem: 'latn',
  }).format(price);
};
</script>
