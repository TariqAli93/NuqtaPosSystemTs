<template>
  <v-dialog
    :model-value="props.modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="updateModelValue"
  >
    <!-- Outer wrapper: flat card filling the dialog -->
    <v-card rounded="0" flat dir="rtl" class="position-relative overflow-hidden h-100">
      <v-row class="w-100 h-100 ma-0">
        <!-- ── Left Panel: Summary ── -->
        <v-col cols="12" md="4" lg="3">
          <v-card rounded="0" flat class="position-relative h-100 pa-3 pb-16">
            <v-sheet class="mt-12" color="transparent">
              <!-- Subtotal -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">المجموع الفرعي</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(subtotalValue)
                }}</span>
              </div>

              <!-- Discount -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">الخصم</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(appliedDiscount)
                }}</span>
              </div>

              <!-- Grand total -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-h6 font-weight-black">إجمالي المستحق</span>
                <span class="text-h6 font-weight-black text-end text-no-wrap">{{
                  formatCurrency(effectiveTotal)
                }}</span>
              </div>

              <!-- Paid -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">مدفوعة</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(paidAmount)
                }}</span>
              </div>

              <!-- Settlement (remaining / change) -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">{{ settlementLabel }}</span>
                <span
                  :class="[
                    'text-body-1 font-weight-medium text-end text-no-wrap',
                    settlementValueClass,
                  ]"
                  >{{ formatCurrency(settlementValue) }}</span
                >
              </div>
            </v-sheet>

            <!-- Confirm button pinned to the bottom of the left panel -->
            <div class="position-absolute bottom-0 left-0 right-0 mb-5 mx-3">
              <v-btn
                block
                size="x-large"
                rounded="lg"
                class="text-h6 font-weight-black"
                height="64"
                color="primary"
                :disabled="!canConfirm"
                :loading="props.busy"
                @click="confirmPayment"
              >
                تأكيد
              </v-btn>
            </div>
          </v-card>
        </v-col>

        <!-- ── Right Panel: Input & Controls ── -->
        <v-col cols="12" md="8" lg="9">
          <v-sheet rounded="0" class="d-flex flex-column h-100 pa-4 align-center justify-center">
            <div class="w-100">
              <div class="text-subtitle-1 font-weight-bold text-end">وسائل الدفع</div>
              <div class="text-body-2 text-medium-emphasis text-end mt-1">
                {{ selectedMethodLabel }}
              </div>

              <!-- Amount input -->
              <div class="d-flex align-center ga-2 mt-5 w-100">
                <v-text-field
                  :model-value="amountInput"
                  label="Amount"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="flex-1-1"
                  inputmode="decimal"
                  autocomplete="off"
                  @update:model-value="onAmountInput"
                >
                  <template #prepend-inner>
                    <span class="text-body-2 text-medium-emphasis">{{ props.currency }}</span>
                  </template>

                  <template #append-inner>
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      :disabled="props.busy"
                      @click="clearAmount"
                    >
                      <v-icon size="20">mdi-delete-outline</v-icon>
                    </v-btn>
                  </template>
                </v-text-field>
              </div>

              <!-- Extra-discount editor (expand transition) -->
              <v-expand-transition>
                <v-sheet v-if="discountEditorOpen" rounded="lg" class="border pa-3 mt-3">
                  <v-text-field
                    :model-value="extraDiscountInput"
                    variant="outlined"
                    hide-details
                    inputmode="decimal"
                    autocomplete="off"
                    label="إضافة خصم"
                    @update:model-value="onExtraDiscountInput"
                  />
                </v-sheet>
              </v-expand-transition>
            </div>

            <v-spacer />

            <!-- Bottom controls: side actions + numpad -->
            <div class="d-flex ga-5 w-100">
              <!-- Side action buttons (25 % width) -->
              <div
                class="d-flex flex-column align-center justify-space-between ga-3"
                style="width: 25%"
              >
                <v-btn
                  block
                  variant="tonal"
                  color="warning"
                  :disabled="props.busy"
                  @click="fillExact"
                >
                  تسوية
                </v-btn>
                <v-btn
                  block
                  variant="tonal"
                  color="warning"
                  :disabled="props.busy"
                  @click="toggleDiscountEditor"
                >
                  الخصم
                </v-btn>

                <v-btn
                  block
                  :color="selectedPaymentType === 'cash' ? 'primary' : undefined"
                  :variant="selectedPaymentType === 'cash' ? 'flat' : 'outlined'"
                  :disabled="props.busy"
                  @click="selectedPaymentType = 'cash'"
                >
                  نقدي
                </v-btn>
              </div>

              <!-- Numpad grid (75 % width) -->
              <v-row dense style="width: 75%">
                <v-col v-for="key in keypadKeys" :key="key.id" cols="4">
                  <v-btn
                    variant="elevated"
                    color="primary"
                    block
                    height="64"
                    class="text-h6 font-weight-bold"
                    :disabled="props.busy"
                    @click="handleKeypadPress(key.id)"
                  >
                    <v-icon v-if="key.id === 'backspace'" size="26">mdi-backspace-outline</v-icon>
                    <span v-else>{{ key.label }}</span>
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { SaleInput } from '@/types/domain';
import { safeParseAmount } from './safeParseAmount';

type ConfirmedPayload = {
  paid: number;
  paymentType: SaleInput['paymentType'];
  discount?: number;
};

interface Props {
  modelValue: boolean;
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  currency?: string;
  cashierName?: string;
  cashierTitle?: string;
  busy?: boolean;
  allowPartial?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  subtotal: undefined,
  discount: 0,
  tax: 0,
  currency: 'USD',
  cashierName: '',
  cashierTitle: 'POS Client',
  busy: false,
  allowPartial: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirmed: [payload: ConfirmedPayload];
}>();

const amountInput = ref('');
const extraDiscountInput = ref('');
const selectedPaymentType = ref<SaleInput['paymentType']>('cash');
const discountEditorOpen = ref(false);

const keypadKeys = [
  { id: '7', label: '7' },
  { id: '8', label: '8' },
  { id: '9', label: '9' },
  { id: '4', label: '4' },
  { id: '5', label: '5' },
  { id: '6', label: '6' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '0', label: '0' },
  { id: '.', label: '.' },
  { id: 'backspace', label: '⌫' },
];

const selectedMethodLabel = computed(() => {
  if (selectedPaymentType.value === 'installment') return 'تقسيط';
  if (selectedPaymentType.value === 'mixed') return 'مختلط';
  return 'نقدي';
});

const cashierNameText = computed(() => props.cashierName?.trim() || 'POS Client');

const baseDiscount = computed(() => Math.max(0, props.discount));

const subtotalValue = computed(() => {
  if (typeof props.subtotal === 'number') {
    return Math.max(0, props.subtotal);
  }
  return Math.max(0, props.total + baseDiscount.value - Math.max(0, props.tax));
});

const extraDiscount = computed(() => {
  const parsed = safeParseAmount(extraDiscountInput.value);
  return Math.min(parsed, subtotalValue.value);
});

const appliedDiscount = computed(() => {
  return Math.min(baseDiscount.value + extraDiscount.value, subtotalValue.value);
});

const effectiveTotal = computed(() => {
  if (typeof props.subtotal === 'number') {
    return Math.max(0, subtotalValue.value - appliedDiscount.value + Math.max(0, props.tax));
  }
  return Math.max(0, props.total - extraDiscount.value);
});

const paidAmount = computed(() => safeParseAmount(amountInput.value));
const remainingAmount = computed(() => Math.max(effectiveTotal.value - paidAmount.value, 0));
const changeAmount = computed(() => Math.max(paidAmount.value - effectiveTotal.value, 0));

const settlementLabel = computed(() => (changeAmount.value > 0 ? 'الباقي/الراجع' : 'متبقي'));
const settlementValue = computed(() =>
  changeAmount.value > 0 ? changeAmount.value : remainingAmount.value
);

/* Theme-safe color tokens: text-success / text-error adapt to light & dark mode */
const settlementValueClass = computed(() => {
  if (changeAmount.value > 0) return 'text-success';
  if (remainingAmount.value > 0) return 'text-error';
  return '';
});

const canConfirm = computed(() => {
  if (props.busy || effectiveTotal.value <= 0) return false;
  if (props.allowPartial) return paidAmount.value > 0;
  return paidAmount.value >= effectiveTotal.value;
});

function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: props.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      numberingSystem: 'latn',
    }).format(value);
  } catch {
    return new Intl.NumberFormat('ar-IQ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      numberingSystem: 'latn',
    }).format(value);
  }
}

function normalizeDecimalInput(value: string): string {
  let normalized = value.replace(/[^\d.]/g, '');

  const dotIndex = normalized.indexOf('.');
  if (dotIndex >= 0) {
    const integerPart = normalized.slice(0, dotIndex);
    const decimalPart = normalized.slice(dotIndex + 1).replace(/\./g, '');
    normalized = `${integerPart}.${decimalPart}`;
  }

  return normalized;
}

function toInputAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

const isRewriteMode = ref(true); // first keypad press overwrites existing value
const entryMode = ref<'int' | 'dec'>('int'); // digits go to integer unless '.' pressed
function onAmountInput(value: string) {
  amountInput.value = normalizeDecimalInput(value || '');
  // Manual typing should NOT overwrite on next keypad press.
  isRewriteMode.value = false;
  // If user typed a dot manually, treat as decimal mode.
  entryMode.value = amountInput.value.includes('.') ? 'dec' : 'int';
}

function onExtraDiscountInput(value: string) {
  extraDiscountInput.value = normalizeDecimalInput(value || '');
}

function appendAmount(char: string) {
  if (props.busy) return;
  if (!/^\d$/.test(char) && char !== '.') return;

  // Rewrite behavior: first keypad press clears and starts fresh
  if (isRewriteMode.value) {
    amountInput.value = '';
    isRewriteMode.value = false;
    entryMode.value = 'int';
  }

  const current = amountInput.value ?? '';

  // Dot key: switch to decimal mode (only once)
  if (char === '.') {
    if (current.includes('.')) return;
    amountInput.value = current === '' ? '0.' : current + '.';
    entryMode.value = 'dec';
    return;
  }

  // Digit key
  if (current === '') {
    amountInput.value = char;
    return;
  }

  // Prevent leading zeros in integer mode
  if (entryMode.value === 'int' && current === '0' && !current.includes('.')) {
    amountInput.value = char;
    return;
  }

  // KEY RULE YOU ASKED FOR:
  // - If '.' exists but we're still in integer mode, insert digit BEFORE '.'
  // - If decimal mode, append to the end (fractional part)
  const dotIndex = current.indexOf('.');
  if (dotIndex >= 0 && entryMode.value === 'int') {
    const intPart = current.slice(0, dotIndex);
    const decPart = current.slice(dotIndex); // includes '.'
    amountInput.value = (intPart === '0' ? char : intPart + char) + decPart;
    return;
  }

  // Normal append (integer without dot OR decimal mode)
  amountInput.value = current + char;
}

function backspaceAmount() {
  if (props.busy) return;

  const cur = amountInput.value;
  if (!cur) return;

  isRewriteMode.value = false;

  amountInput.value = cur.slice(0, -1);

  // If dot got deleted, revert to integer mode
  entryMode.value = amountInput.value.includes('.') ? entryMode.value : 'int';
}

function clearAmount() {
  if (props.busy) return;
  amountInput.value = '';
  isRewriteMode.value = false;
  entryMode.value = 'int';
}

function fillExact() {
  if (props.busy) return;
  amountInput.value = toInputAmount(effectiveTotal.value);

  // IMPORTANT: after programmatic fill, next keypad press should overwrite
  isRewriteMode.value = true;
  entryMode.value = 'int';
}

function toggleDiscountEditor() {
  if (props.busy) return;
  discountEditorOpen.value = !discountEditorOpen.value;
  if (!discountEditorOpen.value) {
    extraDiscountInput.value = '';
  }
}

function handleKeypadPress(key: string) {
  if (key === 'backspace') {
    backspaceAmount();
    return;
  }
  appendAmount(key);
}

function closeOverlay() {
  emit('update:modelValue', false);
}

function updateModelValue(value: boolean) {
  if (!value) {
    closeOverlay();
    return;
  }
  emit('update:modelValue', true);
}

function confirmPayment() {
  if (!canConfirm.value) return;

  const payload: ConfirmedPayload = {
    paid: paidAmount.value,
    paymentType: selectedPaymentType.value,
  };

  if (appliedDiscount.value !== baseDiscount.value) {
    payload.discount = appliedDiscount.value;
  }

  emit('confirmed', payload);
}

function resetState() {
  selectedPaymentType.value = 'cash';
  discountEditorOpen.value = false;
  extraDiscountInput.value = '';

  // Pre-fill exact total, but next keypad press should overwrite
  amountInput.value = toInputAmount(effectiveTotal.value);
  isRewriteMode.value = true;
  entryMode.value = 'int';
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!props.modelValue) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    appendAmount(event.key);
    return;
  }

  if (event.key === '.') {
    event.preventDefault();
    event.stopPropagation();
    appendAmount('.');
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    event.stopPropagation();
    backspaceAmount();
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    event.stopPropagation();
    clearAmount();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    if (canConfirm.value) {
      confirmPayment();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeOverlay();
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetState();
      window.addEventListener('keydown', handleGlobalKeydown, true);
    } else {
      window.removeEventListener('keydown', handleGlobalKeydown, true);
    }
  }
);
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true);
});
</script>
