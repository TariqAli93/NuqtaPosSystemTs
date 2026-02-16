<template>
  <div>
    <v-btn
      :color="props.canPay ? 'primary' : undefined"
      :variant="props.canPay ? 'elevated' : 'outlined'"
      :disabled="!props.canPay"
      block
      class="grow pay-button"
      size="large"
      @click="emit('pay')"
    >
      <template #prepend class="w-fit">
        <v-icon size="18">mdi-cash-register</v-icon>
      </template>
      <template #default>
        <span class="text-body-2"> {{ t('pos.pay') }}</span>
      </template>
      <template #append>
        <v-hotkey border="0" display-mode="icon" elevation="0" keys="f10" />
      </template>
    </v-btn>

    <div class="item-group-container">
      <v-item-group class="actions-grid-auto mt-2">
        <v-item v-for="action in actions" :key="action.event">
          <v-btn
            :color="action.color"
            :variant="action.variant"
            :disabled="action.disabled"
            block
            class="grow min-h-10 sm:min-h-12"
            @click="emitAction(action.event)"
          >
            <template #prepend>
              <v-icon size="18">{{ action.icon }}</v-icon>
            </template>
            <template #default>
              <span class="text-body-2">{{ action.label }}</span>
            </template>
            <template #append>
              <v-hotkey border="0" display-mode="symbol" elevation="0" :keys="action.key" />
            </template>
          </v-btn>
        </v-item>
      </v-item-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  {
    event: 'clear' as ActionEvent,
    icon: 'mdi-trash-can-outline',
    label: t('common.clear'),
    key: 'f9',
    color: 'error',
    variant: 'outlined' as const,
    disabled: !props.canClear,
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
</script>

<style lang="scss" scoped>
.pay-button {
  justify-content: space-between !important;
}

.item-group-container {
  container-type: inline-size; /* يخلي العناصر داخلها تقيس عرض الحاوية */
}

.actions-grid-auto {
  display: grid;
  gap: 0.25rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* لما drawer يصير أوسع */
@container (min-width: 360px) {
  .actions-grid-auto {
    gap: 0.5rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* إذا بعد أوسع */
@container (min-width: 520px) {
  .actions-grid-auto {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
