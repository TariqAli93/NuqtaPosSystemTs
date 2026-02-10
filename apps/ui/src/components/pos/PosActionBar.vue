<template>
  <v-card variant="elevated" border="0" class="px-4 pt-4 pb-6">
    <v-row dense>
      <v-col cols="12" class="d-flex">
        <v-btn
          color="primary"
          variant="outlined"
          :disabled="!props.canPay || isPayLoading"
          block
          class="flex-grow-1 justify-between"
          @click="handlePay"
        >
          <template #prepend>
            <v-icon size="18">mdi-cash-register</v-icon>
          </template>
          <template #default>
            <span class="text-body-2">{{ t('pos.pay') }}</span>
          </template>
          <template #append>
            <v-hotkey border="0" display-mode="icon" elevation="0" keys="enter" />
          </template>
        </v-btn>
      </v-col>
      <v-col v-for="action in actions" :key="action.event" cols="4" class="d-flex">
        <v-btn
          :color="action.color"
          :variant="action.variant"
          :disabled="action.disabled"
          block
          class="flex-grow-1"
          @click="emitAction(action.event)"
        >
          <template #prepend>
            <v-icon size="18">{{ action.icon }}</v-icon>
          </template>
          <template #default>
            <span class="text-body-2">{{ action.label }}</span>
          </template>
          <template #append>
            <v-hotkey border="0" display-mode="icon" elevation="0" :keys="action.key" />
          </template>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { t } from '@/i18n/t';

interface Props {
  canPay?: boolean;
  canClear?: boolean;
}

type ActionEvent = 'hold' | 'discount' | 'customer' | 'clear' | 'note' | 'more';

const props = withDefaults(defineProps<Props>(), {
  canPay: false,
  canClear: false,
});

const emit = defineEmits<{
  pay: [];
  hold: [];
  discount: [];
  customer: [];
  clear: [];
  note: [];
  more: [];
}>();

const isPayLoading = ref(false);

const actions = computed(() => [
  {
    event: 'hold' as ActionEvent,
    icon: 'mdi-pause-circle-outline',
    label: t('pos.hold'),
    key: 'f2',
    color: undefined,
    variant: 'outlined' as const,
    disabled: false,
  },
  {
    event: 'discount' as ActionEvent,
    icon: 'mdi-tag-outline',
    label: t('pos.discount'),
    key: 'f8',
    color: undefined,
    variant: 'outlined' as const,
    disabled: false,
  },
  {
    event: 'customer' as ActionEvent,
    icon: 'mdi-account-outline',
    label: t('pos.customer'),
    key: 'f4',
    color: undefined,
    variant: 'outlined' as const,
    disabled: false,
  },
  {
    event: 'clear' as ActionEvent,
    icon: 'mdi-trash-can-outline',
    label: t('common.clear'),
    key: 'f9',
    color: 'error',
    variant: 'outlined' as const,
    disabled: !props.canClear,
  },
  {
    event: 'note' as ActionEvent,
    icon: 'mdi-note-text-outline',
    label: t('pos.note'),
    key: 'n',
    color: undefined,
    variant: 'outlined' as const,
    disabled: false,
  },
  {
    event: 'more' as ActionEvent,
    icon: 'mdi-dots-horizontal',
    label: t('pos.more'),
    key: 'm',
    color: undefined,
    variant: 'outlined' as const,
    disabled: false,
  },
]);

function emitAction(event: ActionEvent) {
  if (event === 'hold') emit('hold');
  else if (event === 'discount') emit('discount');
  else if (event === 'customer') emit('customer');
  else if (event === 'clear') emit('clear');
  else if (event === 'note') emit('note');
  else emit('more');
}

const handlePay = async () => {
  if (isPayLoading.value) return;
  isPayLoading.value = true;

  try {
    emit('pay');
  } finally {
    setTimeout(() => {
      isPayLoading.value = false;
    }, 1000);
  }
};
</script>
