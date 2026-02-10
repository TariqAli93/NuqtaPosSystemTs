<template>
  <v-container>
    <div class="win-page">
      <v-card class="win-card win-card--padded" flat>
        <div class="win-title">{{ t('system.notFoundTitle') }}</div>
        <div class="win-subtitle">{{ t('system.notFoundSubtitle') }}</div>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { t } from '../../i18n/t';
</script>
