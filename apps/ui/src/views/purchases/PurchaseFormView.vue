<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <h1 class="text-h5 font-weight-bold">فاتورة مشتريات جديدة</h1>
      </v-col>
    </v-row>

    <v-form ref="formRef" @submit.prevent="onSubmit">
      <v-card class="mb-4">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.supplierId"
                :items="suppliersStore.items"
                item-title="name"
                item-value="id"
                label="المورد"
                :rules="[(v) => !!v || 'مطلوب']"
                variant="outlined"
                density="compact"
                @focus="suppliersStore.fetchSuppliers()"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.invoiceNumber"
                label="رقم الفاتورة"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Line Items -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold">المنتجات</span>
          <v-spacer />
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="addLine"
          >
            إضافة
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>المنتج</th>
                <th style="width: 120px">الوحدة</th>
                <th style="width: 90px">الكمية</th>
                <th style="width: 140px">سعر الوحدة</th>
                <th style="width: 120px">رقم الدفعة</th>
                <th style="width: 140px">تاريخ الانتهاء</th>
                <th style="width: 140px">المجموع</th>
                <th style="width: 50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, idx) in form.items" :key="idx">
                <td>
                  <v-autocomplete
                    v-model="line.productId"
                    :items="products"
                    item-title="name"
                    item-value="id"
                    variant="plain"
                    density="compact"
                    hide-details
                  />
                </td>
                <td>
                  <v-text-field
                    v-model="line.unitName"
                    variant="plain"
                    density="compact"
                    hide-details
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="line.quantity"
                    type="number"
                    variant="plain"
                    density="compact"
                    hide-details
                    min="1"
                  />
                </td>
                <td>
                  <MoneyInput
                    v-model="line.unitCost"
                    density="compact"
                    variant="plain"
                    hide-details
                  />
                </td>
                <td>
                  <v-text-field
                    v-model="line.batchNumber"
                    variant="plain"
                    density="compact"
                    hide-details
                    placeholder="B001"
                  />
                </td>
                <td>
                  <v-text-field
                    v-model="line.expiryDate"
                    type="date"
                    variant="plain"
                    density="compact"
                    hide-details
                  />
                </td>
                <td>
                  <MoneyDisplay :amount="line.quantity * line.unitCost" size="sm" />
                </td>
                <td>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="form.items.splice(idx, 1)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Totals & Payment -->
      <v-card class="mb-4">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="4">
              <MoneyInput v-model="form.discount" label="الخصم" />
            </v-col>
            <v-col cols="12" sm="4">
              <MoneyInput v-model="form.tax" label="الضريبة" />
            </v-col>
            <v-col cols="12" sm="4">
              <MoneyInput v-model="form.paidAmount" label="المبلغ المدفوع" />
            </v-col>
          </v-row>
          <v-row dense class="mt-2">
            <v-col class="text-h6 font-weight-bold">
              الإجمالي: <MoneyDisplay :amount="grandTotal" size="lg" />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-textarea
        v-model="form.notes"
        label="ملاحظات"
        variant="outlined"
        density="compact"
        rows="2"
        class="mb-4"
      />

      <div class="d-flex ga-3">
        <v-btn type="submit" color="primary" :loading="purchasesStore.loading">حفظ</v-btn>
        <v-btn variant="text" @click="router.back()">إلغاء</v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePurchasesStore } from '../../stores/purchasesStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { productsClient } from '../../ipc';
import MoneyInput from '../../components/shared/MoneyInput.vue';
import { generateIdempotencyKey } from '../../utils/idempotency';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';

const router = useRouter();
const purchasesStore = usePurchasesStore();
const suppliersStore = useSuppliersStore();
const formRef = ref();
const products = ref<{ id: number; name: string }[]>([]);

const form = reactive({
  supplierId: null as number | null,
  invoiceNumber: '',
  discount: 0,
  tax: 0,
  paidAmount: 0,
  notes: '',
  items: [
    {
      productId: null as number | null,
      unitName: 'piece',
      unitFactor: 1,
      quantity: 1,
      unitCost: 0,
      batchNumber: '',
      expiryDate: '',
    },
  ],
});

const subtotal = computed(() => form.items.reduce((s, l) => s + l.quantity * l.unitCost, 0));
const grandTotal = computed(() => subtotal.value - form.discount + form.tax);

onMounted(async () => {
  suppliersStore.fetchSuppliers();
  const res = await productsClient.getAll();
  if (res.ok) products.value = res.data.items.map((p: any) => ({ id: p.id, name: p.name }));
});

function addLine() {
  form.items.push({
    productId: null,
    unitName: 'piece',
    unitFactor: 1,
    quantity: 1,
    unitCost: 0,
    batchNumber: '',
    expiryDate: '',
  });
}

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  const result = await purchasesStore.createPurchase({
    supplierId: form.supplierId!,
    invoiceNumber: form.invoiceNumber,
    items: form.items
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId!,
        unitName: l.unitName,
        unitFactor: l.unitFactor,
        quantity: l.quantity,
        unitCost: l.unitCost,
        batchNumber: l.batchNumber || undefined,
        expiryDate: l.expiryDate || undefined,
      })),
    discount: form.discount,
    tax: form.tax,
    paidAmount: form.paidAmount,
    notes: form.notes || undefined,
    idempotencyKey: generateIdempotencyKey('purchase'),
  });
  if (result.ok) router.push({ name: 'Purchases' });
}
</script>
