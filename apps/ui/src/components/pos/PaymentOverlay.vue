<template>
  <v-dialog
    :model-value="props.modelValue"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="updateModelValue"
  >
    <!-- Outer wrapper: flat card filling the dialog -->
    <v-card rounded="0" flat dir="rtl" class="position-relative overflow-hidden h-100">
      <v-card-title>
        <div class="d-flex align-center ga-3">
          <v-icon size="28">mdi-cash-register</v-icon>
          <div>
            <div class="text-h6 font-weight-bold">إتمام الدفع</div>
            <div class="text-body-2 text-medium-emphasis">
              <span>الكاشير: {{ cashierNameText }}</span>
            </div>
          </div>

          <v-spacer />

          <v-btn variant="text" color="error" class="pa-0" @click="closeOverlay">
            <v-hotkey border="0" display-mode="symbol" elevation="0" keys="esc" class="mx-0 my-0" />
          </v-btn>
        </div>
      </v-card-title>
      <v-row dense no-gutters class="w-100 h-100 ma-0">
        <!-- ── Left Panel: Summary ── -->
        <v-col cols="12" md="5" lg="4">
          <v-card rounded="0" flat class="position-relative h-100 pa-3 pb-16 border-l-0!">
            <v-sheet class="mt-12" color="transparent">
              <!-- Subtotal -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">المجموع الفرعي</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(subtotalValue)
                }}</span>
              </div>

              <v-divider class="my-2" />

              <!-- Discount -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">الخصم</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(appliedDiscount)
                }}</span>
              </div>

              <v-divider class="my-2" />

              <!-- Grand total -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-h6 font-weight-black">إجمالي المستحق</span>
                <span class="text-h6 font-weight-black text-end text-no-wrap">{{
                  formatCurrency(effectiveTotal)
                }}</span>
              </div>

              <v-divider class="my-3" />

              <!-- Paid -->
              <div class="d-flex justify-space-between align-baseline ga-5 py-2">
                <span class="text-body-1 font-weight-medium">مدفوعة</span>
                <span class="text-body-1 font-weight-medium text-end text-no-wrap">{{
                  formatCurrency(paidAmount)
                }}</span>
              </div>

              <v-divider class="my-2" />

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
        <v-col cols="12" md="7" lg="8">
          <v-card rounded="0" class="d-flex flex-column h-100 pa-4 align-center justify-center">
            <div class="w-100">
              <div class="text-subtitle-1 font-weight-bold text-start">وسائل الدفع</div>
              <div class="text-body-2 text-medium-emphasis text-start mt-1">
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
                  @focus="setActiveField('amount')"
                  @blur="clearActiveField('amount')"
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
                <v-sheet v-if="discountEditorOpen" rounded="lg" class="mt-3">
                  <v-text-field
                    :model-value="extraDiscountInput"
                    variant="outlined"
                    hide-details
                    label="إضافة خصم"
                    @update:model-value="onExtraDiscountInput"
                    @focus="setActiveField('discount')"
                    @blur="clearActiveField('discount')"
                  />
                </v-sheet>
              </v-expand-transition>

              <!-- Card reference number input -->
              <v-expand-transition>
                <v-text-field
                  v-if="selectedPaymentMethod === 'card'"
                  v-model="referenceNumber"
                  label="رقم المرجع"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="mt-3"
                  prepend-inner-icon="mdi-credit-card-outline"
                  autocomplete="off"
                  @focus="setActiveField('reference')"
                  @blur="clearActiveField('reference')"
                />
              </v-expand-transition>

              <!-- Credit requires customer warning -->
              <v-expand-transition>
                <v-alert
                  v-if="selectedPaymentMethod === 'credit' && !props.hasCustomer"
                  type="warning"
                  density="compact"
                  variant="tonal"
                  class="mt-3"
                >
                  يجب ربط زبون لاستخدام الدفع الآجل
                </v-alert>
              </v-expand-transition>
            </div>

            <v-spacer />

            <!-- Bottom controls: side actions + numpad -->
            <div
              class="flex flex-col ga-3 justify-between w-100 pa-5 rounded-lg bg-surface-variant"
            >
              <div class="grid grid-cols-3 gap-3 pa-4 place-items-center rounded-lg">
                <v-btn
                  v-for="key in keypadKeys"
                  :key="key.id"
                  variant="flat"
                  color="primary"
                  size="x-large"
                  block
                  :disabled="props.busy"
                  @mousedown.prevent
                  @click="handleKeypadPress(key.id)"
                >
                  <v-icon v-if="key.id === 'backspace'" size="26">mdi-backspace-outline</v-icon>
                  <span v-else>{{ key.label }}</span>
                </v-btn>
              </div>

              <v-divider class="my-4 mx-auto w-full bg-surface-variant!" inset color="secondary" />

              <div class="flex flex-row justify-items-stretch">
                <div class="gap-3 w-1/2 grid grid-cols-2 pa-4">
                  <v-btn
                    v-for="method in availablePaymentMethodOptions"
                    size="large"
                    :color="selectedPaymentMethod === method.value ? 'primary' : 'surface'"
                    :variant="selectedPaymentMethod === method.value ? 'flat' : 'elevated'"
                    :disabled="props.busy"
                    @click="selectedPaymentMethod = method.value"
                  >
                    {{ method.label }}
                  </v-btn>
                </div>

                <div class="gap-3 w-1/2 grid grid-cols-1 pa-4">
                  <v-btn
                    block
                    variant="flat"
                    color="primary"
                    size="large"
                    :disabled="props.busy"
                    @click="fillExact"
                  >
                    تسوية
                  </v-btn>
                  <v-btn
                    block
                    variant="flat"
                    color="secondary"
                    size="large"
                    :disabled="props.busy"
                    @click="toggleDiscountEditor"
                  >
                    الخصم
                  </v-btn>
                </div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { PaymentMethod } from '@nuqtaplus/core';
import type { SaleInput } from '@/types/domain';
import { safeParseAmount } from './safeParseAmount';

type ConfirmedPayload = {
  paid: number;
  paymentType: SaleInput['paymentType'];
  discount?: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
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
  hasCustomer?: boolean;
  simpleMode?: boolean;
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
  hasCustomer: false,
  simpleMode: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirmed: [payload: ConfirmedPayload];
}>();

const amountInput = ref('');
const extraDiscountInput = ref('');
const selectedPaymentType = ref<SaleInput['paymentType']>('cash');
const selectedPaymentMethod = ref<PaymentMethod>('cash');
const referenceNumber = ref('');
const discountEditorOpen = ref(false);

const keypadKeys = [
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5', label: '5' },
  { id: '6', label: '6' },
  { id: '7', label: '7' },
  { id: '8', label: '8' },
  { id: '9', label: '9' },
  { id: '.', label: '.' },
  { id: '0', label: '0' },
  { id: 'backspace', label: '⌫' },
];

const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
  { label: 'نقدي', value: 'cash' },
  { label: 'بطاقة', value: 'card' },
  { label: 'آجل', value: 'credit' },
  { label: 'حوالة', value: 'bank_transfer' },
];

const availablePaymentMethodOptions = computed(() =>
  props.simpleMode
    ? paymentMethodOptions.filter((option) => option.value !== 'credit')
    : paymentMethodOptions
);

const selectedMethodLabel = computed(() => {
  if (selectedPaymentMethod.value === 'card') return 'بطاقة';
  if (selectedPaymentMethod.value === 'credit') return 'آجل';
  if (selectedPaymentMethod.value === 'bank_transfer') return 'حوالة';
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

type ActiveField = 'amount' | 'discount' | 'reference' | null;
const activeField = ref<ActiveField>(null);

function setActiveField(field: Exclude<ActiveField, null>) {
  activeField.value = field;
  // For amount, when user focuses it, you probably don't want rewrite mode
  // (or keep it if you want). I recommend disabling rewrite on focus:
  if (field === 'amount') isRewriteMode.value = false;
  console.log('Active field set to', field);
}

function clearActiveField(field?: Exclude<ActiveField, null>) {
  // Only clear if the field that's blurring is the current one
  if (!field || activeField.value === field) activeField.value = null;
}

function appendNumericTo(model: { value: string }, char: string) {
  if (props.busy) return;
  if (!/^\d$/.test(char) && char !== '.') return;

  const current = model.value ?? '';

  if (char === '.') {
    if (current.includes('.')) return;
    model.value = current === '' ? '0.' : current + '.';
    return;
  }

  if (current === '') {
    model.value = char;
    return;
  }

  // prevent leading zeros (optional)
  if (current === '0' && !current.includes('.')) {
    model.value = char;
    return;
  }

  model.value = current + char;
}

function backspaceModel(model: { value: string }) {
  if (props.busy) return;
  const cur = model.value ?? '';
  if (!cur) return;
  model.value = cur.slice(0, -1);
}

function clearModel(model: { value: string }) {
  if (props.busy) return;
  model.value = '';
}

function appendDigitsOnlyTo(model: { value: string }, char: string) {
  if (props.busy) return;
  if (!/^\d$/.test(char)) return;
  model.value = (model.value ?? '') + char;
}

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
  // Card requires reference number
  if (selectedPaymentMethod.value === 'card' && !referenceNumber.value.trim()) return false;
  // Credit requires customer
  if (selectedPaymentMethod.value === 'credit' && !props.hasCustomer) return false;
  if (props.allowPartial) return paidAmount.value > 0;
  return paidAmount.value >= effectiveTotal.value;
});

function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: props.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  return Math.max(0, parseFloat(normalized) || 0).toString();
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
  const field = activeField.value ?? 'amount';

  console.log('Keypad press:', key, 'Active field:', field);

  if (key === 'backspace') {
    if (field === 'amount') backspaceAmount();
    else if (field === 'discount') backspaceModel(extraDiscountInput);
    else if (field === 'reference') backspaceModel(referenceNumber);
    return;
  }

  // dot + digits
  if (field === 'amount') {
    appendAmount(key);
    return;
  }

  if (field === 'discount') {
    appendNumericTo(extraDiscountInput, key);
    return;
  }

  if (field === 'reference') {
    // usually reference is digits-only; ignore '.'
    appendDigitsOnlyTo(referenceNumber, key);
    return;
  }
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
    paymentMethod: selectedPaymentMethod.value,
  };

  if (appliedDiscount.value !== baseDiscount.value) {
    payload.discount = appliedDiscount.value;
  }

  if (selectedPaymentMethod.value === 'card' && referenceNumber.value.trim()) {
    payload.referenceNumber = referenceNumber.value.trim();
  }

  emit('confirmed', payload);
}

function resetState() {
  selectedPaymentType.value = 'cash';
  selectedPaymentMethod.value = 'cash';
  referenceNumber.value = '';
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

  // Route to active field (or amount if none)
  const field = activeField.value ?? 'amount';

  const routeDigitOrDot = (k: string) => {
    if (field === 'amount') appendAmount(k);
    else if (field === 'discount') appendNumericTo(extraDiscountInput, k);
    else if (field === 'reference') appendDigitsOnlyTo(referenceNumber, k);
  };

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    routeDigitOrDot(event.key);
    return;
  }

  if (event.key === '.') {
    // Only amount/discount accept dot
    if (field === 'reference') return;
    event.preventDefault();
    event.stopPropagation();
    routeDigitOrDot('.');
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    event.stopPropagation();
    if (field === 'amount') backspaceAmount();
    else if (field === 'discount') backspaceModel(extraDiscountInput);
    else if (field === 'reference') backspaceModel(referenceNumber);
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    event.stopPropagation();
    if (field === 'amount') clearAmount();
    else if (field === 'discount') clearModel(extraDiscountInput);
    else if (field === 'reference') clearModel(referenceNumber);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    if (canConfirm.value) confirmPayment();
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

watch(
  () => props.simpleMode,
  (isSimpleMode) => {
    if (isSimpleMode && selectedPaymentMethod.value === 'credit') {
      selectedPaymentMethod.value = 'cash';
    }
  },
  { immediate: true }
);
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true);
});
</script>
