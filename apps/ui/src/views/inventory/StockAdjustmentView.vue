<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">تعديل مخزون</h1>
      </v-col>
    </v-row>

    <v-card max-width="700">
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-autocomplete
            v-model="form.productId"
            :items="products"
            item-title="name"
            item-value="id"
            label="المنتج"
            :rules="[(v) => !!v || 'مطلوب']"
            variant="outlined"
            density="compact"
            class="mb-3"
            @update:model-value="onProductChange"
          />

          <!-- Batch selector for expiry-tracked products -->
          <v-select
            v-if="selectedProduct?.isExpire && batches.length > 0"
            v-model="form.batchId"
            :items="batches"
            :item-title="
              (b: any) =>
                `${b.batchNumber} (متوفر: ${b.quantityOnHand}${b.expiryDate ? ' — انتهاء: ' + b.expiryDate : ''})`
            "
            item-value="id"
            label="الدفعة"
            variant="outlined"
            density="compact"
            class="mb-3"
            clearable
            hint="اختر الدفعة للمنتجات التي تتتبع تاريخ الانتهاء"
            persistent-hint
          />

          <v-select
            v-model="form.reason"
            :items="reasons"
            label="السبب"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model.number="form.quantityBase"
            label="الكمية (+ لزيادة، - لنقص)"
            type="number"
            :rules="[(v) => v !== 0 || 'يجب أن لا تكون صفر']"
            variant="outlined"
            density="compact"
            class="mb-3"
            dir="ltr"
          />
          <v-textarea
            v-model="form.notes"
            label="ملاحظات"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />

          <!-- Accounting impact preview -->
          <v-card
            v-if="form.productId && form.quantityBase !== 0"
            variant="tonal"
            color="blue-lighten-5"
            class="mb-4"
          >
            <v-card-title class="text-subtitle-2 font-weight-bold">
              <v-icon size="18" class="me-1">mdi-calculator</v-icon>
              الأثر المحاسبي المتوقع
            </v-card-title>
            <v-card-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th class="text-end">مدين</th>
                    <th class="text-end">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{{ form.quantityBase > 0 ? 'المخزون' : 'خسائر المخزون' }}</td>
                    <td class="text-end" style="direction: ltr; unicode-bidi: embed">
                      {{ form.quantityBase > 0 ? estimatedCost.toLocaleString('en-US') : '' }}
                    </td>
                    <td class="text-end" style="direction: ltr; unicode-bidi: embed">
                      {{ form.quantityBase < 0 ? estimatedCost.toLocaleString('en-US') : '' }}
                    </td>
                  </tr>
                  <tr>
                    <td>{{ form.quantityBase > 0 ? 'تعديل المخزون (دائن)' : 'المخزون' }}</td>
                    <td class="text-end" style="direction: ltr; unicode-bidi: embed">
                      {{ form.quantityBase < 0 ? estimatedCost.toLocaleString('en-US') : '' }}
                    </td>
                    <td class="text-end" style="direction: ltr; unicode-bidi: embed">
                      {{ form.quantityBase > 0 ? estimatedCost.toLocaleString('en-US') : '' }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div class="text-caption text-medium-emphasis mt-2">
                * الأثر الفعلي يُحسب من الخادم حسب تكلفة الدفعات (FIFO)
              </div>
            </v-card-text>
          </v-card>

          <div class="d-flex ga-3">
            <v-btn type="submit" color="primary" :loading="inventoryStore.loading">تنفيذ</v-btn>
            <v-btn variant="text" @click="router.back()">إلغاء</v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryStore } from '../../stores/inventoryStore';
import { productsClient } from '../../ipc';
import { generateIdempotencyKey } from '../../utils/idempotency';

const router = useRouter();
const inventoryStore = useInventoryStore();
const formRef = ref();
const products = ref<{ id: number; name: string; isExpire?: boolean; costPrice?: number }[]>([]);
const batches = ref<any[]>([]);

const selectedProduct = computed(() => products.value.find((p) => p.id === form.productId) ?? null);

const estimatedCost = computed(() => {
  if (!form.productId || form.quantityBase === 0) return 0;
  const product = selectedProduct.value;
  return Math.abs(form.quantityBase) * (product?.costPrice ?? 0);
});

const reasons = [
  { title: 'تعديل يدوي', value: 'manual' },
  { title: 'تالف', value: 'damage' },
  { title: 'رصيد افتتاحي', value: 'opening' },
];

const form = reactive({
  productId: null as number | null,
  reason: 'manual' as 'manual' | 'damage' | 'opening',
  quantityBase: 0,
  notes: '',
  batchId: null as number | null,
});

async function onProductChange() {
  form.batchId = null;
  batches.value = [];
  if (form.productId) {
    const product = selectedProduct.value;
    if (product?.isExpire) {
      const res = await productsClient.getBatches(form.productId);
      if (res.ok) batches.value = res.data ?? [];
    }
  }
}

onMounted(async () => {
  const res = await productsClient.getAll();
  if (res.ok)
    products.value = res.data.items.map((p: any) => ({
      id: p.id,
      name: p.name,
      isExpire: p.isExpire,
      costPrice: p.costPrice,
    }));
});

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  const result = await inventoryStore.adjustStock({
    productId: form.productId!,
    reason: form.reason,
    quantityBase: form.quantityBase,
    notes: form.notes || undefined,
    idempotencyKey: generateIdempotencyKey('adjust'),
  });
  if (result.ok) router.push({ name: 'Inventory' });
}
</script>
