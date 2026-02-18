<template>
  <v-container fluid>
    <v-skeleton-loader v-if="loading" type="card" />

    <template v-else-if="product">
      <v-row class="mb-4" align="center">
        <v-col>
          <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
          <span class="text-h5 font-weight-bold">{{ product.name }}</span>
        </v-col>
        <v-col cols="auto" class="d-flex ga-2">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-pencil"
            :to="{ name: 'ProductEdit', params: { id: product.id } }"
            >تعديل</v-btn
          >
        </v-col>
      </v-row>

      <!-- Quick Stats -->
      <v-row class="mb-4" dense>
        <v-col cols="6" sm="3">
          <v-card variant="tonal">
            <v-card-text class="text-center">
              <div class="text-caption">المخزون</div>
              <div class="text-h6 font-weight-bold">{{ product.stock }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal">
            <v-card-text class="text-center">
              <div class="text-caption">سعر التكلفة</div>
              <MoneyDisplay :amount="product.costPrice" size="lg" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-caption">سعر البيع</div>
              <MoneyDisplay :amount="product.sellingPrice" size="lg" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <div class="text-caption">الربح</div>
              <MoneyDisplay :amount="product.sellingPrice - product.costPrice" size="lg" colored />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="info">معلومات</v-tab>
        <v-tab value="movements">حركات المخزون</v-tab>
        <v-tab value="batches">الدفعات</v-tab>
        <v-tab value="units">الوحدات</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="info">
          <v-card max-width="600">
            <v-card-text>
              <div class="mb-2"><strong>الباركود:</strong> {{ product.barcode || '—' }}</div>
              <div class="mb-2"><strong>SKU:</strong> {{ product.sku || '—' }}</div>
              <div class="mb-2"><strong>الوحدة:</strong> {{ product.unit || '—' }}</div>
              <div class="mb-2"><strong>الحد الأدنى:</strong> {{ product.minStock }}</div>
              <div class="mb-2">
                <strong>انتهاء الصلاحية:</strong> {{ product.isExpire ? 'نعم' : 'لا' }}
              </div>
              <div v-if="product.expireDate" class="mb-2">
                <strong>تاريخ الانتهاء:</strong> {{ product.expireDate }}
              </div>
              <div class="mb-2"><strong>الوصف:</strong> {{ product.description || '—' }}</div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="movements">
          <MovementHistoryTable :movements="movements as any[]" :loading="movementsLoading" />
        </v-window-item>

        <v-window-item value="batches">
          <v-card>
            <v-card-text v-if="!product.isExpire" class="text-center py-8 text-medium-emphasis">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-package-variant</v-icon>
              <div>هذا المنتج لا يتتبع الدفعات</div>
            </v-card-text>
            <v-card-text
              v-else-if="movements.length === 0"
              class="text-center py-8 text-medium-emphasis"
            >
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-package-variant</v-icon>
              <div>لا توجد دفعات مسجلة بعد</div>
            </v-card-text>
            <template v-else>
              <v-data-table
                :headers="batchHeaders"
                :items="batchSummary"
                density="compact"
                :items-per-page="10"
              >
                <template #item.expiryDate="{ item }">
                  <v-chip
                    v-if="item.expiryDate"
                    :color="isExpiringSoon(item.expiryDate) ? 'error' : 'grey'"
                    size="small"
                    variant="tonal"
                  >
                    {{ item.expiryDate }}
                  </v-chip>
                  <span v-else>—</span>
                </template>
              </v-data-table>
            </template>
          </v-card>
        </v-window-item>

        <v-window-item value="units">
          <v-card>
            <v-card-text class="text-center py-8 text-medium-emphasis">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-ruler</v-icon>
              <div>
                الوحدة الأساسية: <strong>{{ product.unit || 'قطعة' }}</strong>
              </div>
              <div class="text-caption mt-2">
                وحدات التعبئة المخصصة ستظهر هنا بعد إضافتها من المشتريات
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <v-alert v-else type="warning" variant="tonal">لم يتم العثور على المنتج</v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsClient, inventoryClient } from '../../ipc';
import type { Product } from '../../types/domain';
import MoneyDisplay from '../../components/shared/MoneyDisplay.vue';
import MovementHistoryTable from '../../components/shared/MovementHistoryTable.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const product = ref<Product | null>(null);
const activeTab = ref('info');
const movements = ref<any[]>([]);
const movementsLoading = ref(false);

const batchHeaders = [
  { title: 'رقم الدفعة', key: 'batchNumber' },
  { title: 'تاريخ الانتهاء', key: 'expiryDate' },
  { title: 'الكمية', key: 'quantity', align: 'center' as const },
];

// Derive batch summary from movements (until dedicated batch query exists)
const batchSummary = computed(() => {
  const batches = new Map<
    string,
    { batchNumber: string; expiryDate: string | null; quantity: number }
  >();
  for (const m of movements.value) {
    if (!m.batchNumber) continue;
    const key = m.batchNumber;
    const existing = batches.get(key);
    const qty = m.movementType === 'in' ? m.quantity : -m.quantity;
    if (existing) {
      existing.quantity += qty;
    } else {
      batches.set(key, {
        batchNumber: m.batchNumber,
        expiryDate: m.expiryDate ?? null,
        quantity: qty,
      });
    }
  }
  return Array.from(batches.values()).filter((b) => b.quantity > 0);
});

function isExpiringSoon(dateStr: string): boolean {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff < 30 * 24 * 60 * 60 * 1000; // 30 days
}

onMounted(async () => {
  const id = Number(route.params.id);
  const res = await productsClient.getById(id);
  if (res.ok) product.value = res.data;
  loading.value = false;

  movementsLoading.value = true;
  const mRes = await inventoryClient.getMovements({ productId: id });
  if (mRes.ok) movements.value = mRes.data.items;
  movementsLoading.value = false;
});
</script>
