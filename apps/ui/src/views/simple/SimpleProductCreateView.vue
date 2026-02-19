<template>
  <v-container fluid>
    <v-alert type="info" variant="tonal" class="mb-3">
      وضع بسيط: استخدم النموذج الأساسي لإضافة المنتجات بدون مساحات عمل محاسبية.
    </v-alert>
    <product-form-view redirect-to="/simple/products" />
  </v-container>
</template>

<script setup lang="ts">
import ProductFormView from '../products/ProductFormView.vue';
</script>
