<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">تعديل مخزون</h1>
      </v-col>
    </v-row>

    <v-card max-width="600">
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryStore } from '../../stores/inventoryStore';
import { productsClient } from '../../ipc';
import { generateIdempotencyKey } from '../../utils/idempotency';

const router = useRouter();
const inventoryStore = useInventoryStore();
const formRef = ref();
const products = ref<{ id: number; name: string }[]>([]);

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
});

onMounted(async () => {
  const res = await productsClient.getAll();
  if (res.ok) products.value = res.data.items.map((p: any) => ({ id: p.id, name: p.name }));
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
