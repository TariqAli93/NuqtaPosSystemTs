<template>
  <v-container fluid>
    <pos-module-view />
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import PosModuleView from '../../modules/pos/PosView.vue';
import { notifyInfo } from '@/utils/notify';

onMounted(() => {
  notifyInfo('تم تشغيل الوضع البسيط. ميزات المحاسبة والدفاتر والمشتريات مخفية حالياً.', {
    dedupeKey: 'simple-mode-sales',
  });
});
</script>
