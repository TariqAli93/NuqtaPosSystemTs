<template>
  <v-navigation-drawer right permanent mobile-breakpoint="md" width="425" retain-focus class="pa-0">
    <v-card flat rounded="0" border="0">
      <v-card-title class="d-flex align-center justify-space-between pa-4" style="min-height: 64px">
        <span class="text-subtitle-1 font-weight-medium">{{ t('pos.cart') }}</span>
        <v-chip size="small" variant="tonal" color="primary">
          {{ items.length }} {{ t('common.items') }}
        </v-chip>
      </v-card-title>

      <v-divider />

      <v-card-text class="flex-grow-1 overflow-y-auto pa-0">
        <v-list v-if="items.length > 0" density="comfortable" bg-color="transparent" class="py-2">
          <v-list-item v-for="(item, index) in items" :key="index" min-height="72" class="px-4">
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ item.productName }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption text-medium-emphasis mt-1">
              {{ formatPrice(item.unitPrice) }} {{ t('pos.each') }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center ga-2">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="$emit('decrease', index)"
                >
                  <v-icon size="18">mdi-minus</v-icon>
                </v-btn>

                <v-sheet color="grey-lighten-4" rounded="md" class="px-3 py-1">
                  <span class="text-body-2 font-weight-medium">{{ item.quantity }}</span>
                </v-sheet>

                <v-btn
                  icon
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="$emit('increase', index)"
                >
                  <v-icon size="18">mdi-plus</v-icon>
                </v-btn>

                <span class="text-body-2 font-weight-bold text-no-wrap" style="max-width: 45px">
                  {{ formatPrice(itemSubtotal(item)) }}
                </span>

                <v-btn
                  icon
                  variant="text"
                  density="comfortable"
                  @click="$emit('remove', index)"
                  class="mr-4"
                >
                  <v-icon size="18" color="error">mdi-close</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-sheet v-else class="d-flex flex-column align-center justify-center px-6 py-8">
          <v-icon size="56" color="grey-lighten-2">mdi-cart-outline</v-icon>
          <div class="text-subtitle-1 mt-4 text-medium-emphasis">{{ t('pos.cartEmpty') }}</div>
          <div class="text-body-2 text-center text-medium-emphasis mt-2">
            {{ t('pos.cartEmptyHint') }}
          </div>
        </v-sheet>
      </v-card-text>
    </v-card>

    <template #append>
      <v-divider />
      <slot name="totals"></slot>
      <v-divider />
      <slot name="actions"></slot>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
import type { SaleItem } from '@/types/domain';

interface Props {
  items: SaleItem[];
}

defineProps<Props>();

defineEmits<{
  increase: [index: number];
  decrease: [index: number];
  remove: [index: number];
}>();

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    numberingSystem: 'latn',
  }).format(price);
};

const itemSubtotal = (item: SaleItem) => {
  return Math.max(0, item.quantity * item.unitPrice - (item.discount || 0));
};
</script>
