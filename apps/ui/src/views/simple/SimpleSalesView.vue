<template>
  <v-container fluid>
    <v-alert type="info" variant="tonal" class="mb-3">
      تم تشغيل الوضع البسيط. ميزات المحاسبة والدفاتر والمشتريات مخفية حالياً.
    </v-alert>
    <pos-module-view />
  </v-container>
</template>

<script setup lang="ts">
import PosModuleView from '../../modules/pos/PosView.vue';
</script>
