<template>
  <v-container fluid>
    <product-form-view redirect-to="/simple/products" />
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ProductFormView from '../products/ProductFormView.vue';
import { notifyInfo } from '@/utils/notify';

onMounted(() => {
  notifyInfo('وضع بسيط: استخدم النموذج الأساسي لإضافة المنتجات بدون مساحات عمل محاسبية.', {
    dedupeKey: 'simple-mode-products',
  });
});
</script>
