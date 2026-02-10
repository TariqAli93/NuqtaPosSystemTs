<template>
  <v-container>
    <div class="win-page">
      <div>
        <div class="win-title">{{ t('about.title') }}</div>
        <div class="win-subtitle">{{ t('about.summary') }}</div>
      </div>

      <v-card class="win-card win-card--padded" flat>
        <v-list>
          <v-list-item :title="t('about.appName')" :subtitle="t('app.name')" />
          <v-list-item :title="t('about.version')" :subtitle="appVersion" />
        </v-list>

        <v-btn color="primary" variant="outlined" class="mt-4" @click="copyVersionInfo">
          {{ t('about.copyVersion') }}
        </v-btn>
      </v-card>

      <v-snackbar v-model="copied" color="success" timeout="2000">
        {{ t('about.copied') }}
      </v-snackbar>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { t } from '../../i18n/t';

const copied = ref(false);
const appVersion =
  ((import.meta as any).env?.VITE_APP_VERSION as string | undefined) || t('app.versionUnavailable');

async function copyVersionInfo() {
  const info = `${t('about.appName')}: ${t('app.name')}\n${t('about.version')}: ${appVersion}`;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(info);
      copied.value = true;
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = info;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copied.value = true;
  } catch (error) {
    console.error(error);
  }
}
</script>
