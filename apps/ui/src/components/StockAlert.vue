<template>
  <v-dialog :model-value="show" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center bg-error text-white pa-4">
        <v-icon class="mr-2">mdi-alert-circle</v-icon>
        <span>{{ title }}</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <div class="text-body-1">{{ message }}</div>
        <div v-if="details" class="text-body-2 text-medium-emphasis mt-2">
          {{ details }}
        </div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn v-if="showCancel" variant="text" color="grey-darken-1" @click="$emit('cancel')">
          {{ cancelText }}
        </v-btn>
        <v-btn variant="flat" :color="confirmColor" @click="$emit('confirm')">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  show: boolean;
  title?: string;
  message: string;
  details?: string;
  showCancel?: boolean;
  cancelText?: string;
  confirmText?: string;
  confirmColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'تنبيه',
  showCancel: true,
  cancelText: 'إلغاء',
  confirmText: 'حسناً',
  confirmColor: 'error',
});

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>
