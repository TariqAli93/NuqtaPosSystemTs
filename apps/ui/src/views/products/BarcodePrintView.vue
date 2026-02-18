<template>
  <v-container fluid>
    <v-row class="mb-4" align="center">
      <v-col>
        <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
        <span class="text-h5 font-weight-bold">طباعة باركود</span>
      </v-col>
    </v-row>

    <v-card max-width="600">
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          قم بإنشاء مهمة طباعة باركود للمنتج المحدد.
        </p>

        <v-autocomplete
          v-model="form.productId"
          :items="products"
          item-title="name"
          item-value="id"
          label="المنتج"
          variant="outlined"
          density="compact"
          class="mb-3"
        />

        <v-text-field
          v-model.number="form.quantity"
          label="عدد الملصقات"
          type="number"
          min="1"
          variant="outlined"
          density="compact"
          class="mb-3"
          dir="ltr"
        />

        <v-btn
          color="primary"
          prepend-icon="mdi-printer"
          :loading="barcodeStore.loading"
          @click="onPrint"
        >
          إنشاء مهمة طباعة
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Recent Jobs -->
    <v-card class="mt-4" v-if="barcodeStore.printJobs.length">
      <v-card-title class="text-subtitle-1 font-weight-bold">مهام الطباعة الأخيرة</v-card-title>
      <v-data-table
        :headers="jobHeaders"
        :items="barcodeStore.printJobs"
        density="compact"
        :items-per-page="10"
      >
        <template #item.status="{ item }">
          <v-chip
            :color="item.status === 'printed' ? 'success' : 'warning'"
            size="small"
            variant="tonal"
          >
            {{ item.status === 'printed' ? 'مطبوع' : 'معلق' }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBarcodeStore } from '../../stores/barcodeStore';
import { productsClient } from '../../ipc';

const router = useRouter();
const barcodeStore = useBarcodeStore();
const products = ref<{ id: number; name: string; barcode?: string }[]>([]);

const form = reactive({
  productId: null as number | null,
  quantity: 1,
});

const jobHeaders = [
  { title: 'المنتج', key: 'productName' },
  { title: 'الكمية', key: 'quantity', align: 'center' as const },
  { title: 'الحالة', key: 'status', width: '100px' },
];

onMounted(async () => {
  const res = await productsClient.getAll();
  if (res.ok)
    products.value = res.data.items.map((p: any) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
    }));
  barcodeStore.fetchPrintJobs();
});

async function onPrint() {
  if (!form.productId) return;
  const product = products.value.find((p) => p.id === form.productId);
  if (!product) return;

  await barcodeStore.createPrintJob({
    templateId: 1,
    productId: product.id,
    productName: product.name,
    barcode: product.barcode,
    quantity: form.quantity,
  });
  barcodeStore.fetchPrintJobs();
}
</script>
