<template>
  <v-card
    hover
    link
    min-height="156"
    class="d-flex flex-column pa-3"
    @click="handleSelect(product)"
    :disabled="!product.stock || product.stock <= 0"
  >
    <v-badge
      v-if="!product.stock || product.stock <= 0"
      color="red"
      content="Out of Stock"
    ></v-badge>

    <v-sheet
      color="grey-lighten-4"
      rounded="md"
      height="72"
      class="d-flex align-center justify-center mb-3"
    >
      <v-icon size="30" color="grey">mdi-package-variant-closed</v-icon>
    </v-sheet>

    <div class="text-body-2 font-weight-medium text-truncate">{{ product.name }}</div>

    <div class="text-h6 font-weight-bold text-primary mt-1 text-no-wrap">
      {{ formatPrice(product.sellingPrice) }}
    </div>

    <div
      v-if="showStock"
      class="text-caption text-medium-emphasis mt-1"
      :id="`quantity-input-${product.id}`"
    >
      {{ t('pos.stock') }}: {{ product.stock || 0 }}
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
import type { Product } from '@/types/domain';
import { onMounted, onUnmounted } from 'vue';

interface Props {
  product: Product;
  showStock?: boolean;
}

withDefaults(defineProps<Props>(), {
  showStock: true,
});

const emit = defineEmits<{
  select: [product: Product];
}>();

const handleSelect = (product: Product) => {
  if (product.stock && product.stock > 0) {
    emit('select', product);
  }
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(price);
};
</script>
