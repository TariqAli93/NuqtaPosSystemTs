<template>
  <v-card class="d-flex flex-column">
    <v-card-title class="d-flex align-center">
      <span class="text-subtitle-1 font-weight-bold">ملخص المنتج</span>
      <v-spacer />
      <template v-if="product">
        <v-btn icon="mdi-barcode" variant="text" size="small" @click="$emit('openBarcode')" />
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="$emit('editProduct')" />
        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          @click="$emit('deleteProduct')"
        />
      </template>
    </v-card-title>

    <v-card-text class="grow">
      <v-skeleton-loader v-if="loading" type="article, actions" />
      <template v-else-if="product">
        <div class="text-h6 font-weight-bold mb-1">{{ product.name }}</div>
        <div class="text-caption text-medium-emphasis mb-4">
          SKU: {{ product.sku || '—' }} | باركود: {{ product.barcode || '—' }}
        </div>

        <v-row dense class="mb-2">
          <v-col cols="6">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center">
                <div class="text-caption">المخزون الحالي</div>
                <div class="text-body-1 font-weight-medium">{{ product.stock || 0 }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card variant="tonal" :color="productStockStatusColor">
              <v-card-text class="text-center">
                <div class="text-caption">حالة المخزون</div>
                <div class="text-body-1 font-weight-medium">
                  {{ productStockStatusText }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row dense class="mb-2">
          <v-col cols="6">
            <v-card variant="tonal">
              <v-card-text class="text-center">
                <div class="text-caption">سعر التكلفة</div>
                <div class="text-body-1 font-weight-medium">
                  {{ formatMoney(product.costPrice) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-caption">سعر البيع</div>
                <div class="text-body-1 font-weight-medium">
                  {{ formatMoney(product.sellingPrice) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-alert
          v-if="product.isExpire"
          type="warning"
          variant="tonal"
          class="mb-2"
          density="compact"
        >
          المنتج يتتبع الصلاحية. تاريخ الانتهاء: {{ product.expireDate || 'غير محدد' }}
        </v-alert>
      </template>

      <div v-else class="d-flex flex-column align-center justify-center h-100 text-medium-emphasis">
        <v-icon size="42" class="mb-2">mdi-package-variant-closed</v-icon>
        <div>اختر منتجاً من القائمة لعرض التفاصيل</div>
      </div>
    </v-card-text>

    <v-divider />
    <v-card-actions>
      <v-btn color="primary" variant="tonal" :disabled="!product" @click="$emit('openAdjustStock')">
        تعديل المخزون
      </v-btn>
      <v-spacer />
      <v-btn color="primary" :disabled="!product" @click="$emit('editProduct')">تعديل المنتج</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatMoney } from '@/utils/formatters';
import type { Product } from '@nuqtaplus/core';

const props = defineProps<{
  product: Product | null;
  loading: boolean;
}>();

defineEmits<{
  editProduct: [];
  deleteProduct: [];
  openBarcode: [];
  openAdjustStock: [];
}>();

const lowStock = computed(() => {
  if (!props.product) return false;

  // bug fix: if ptoduct stock is 0, it should not be considered low stock, but out of stock
  if (props.product.stock === 0) return false;
  return props.product.stock <= props.product.minStock;
});

const productStockStatusText = computed(() => {
  if (!props.product) return 'نفذ المخزون';
  if (props.product.stock === 0) return 'نفذ المخزون';
  if (props.product.stock <= props.product.minStock) return 'مخزون منخفض';
  return 'متوفر';
});

const productStockStatusColor = computed(() => {
  if (!props.product) return 'error';
  if (props.product.stock === 0) return 'error';
  if (props.product.stock <= props.product.minStock) return 'warning';
  return 'success';
});
</script>
