<template>
  <v-card flat>
    <v-card-text class="d-flex align-center ga-3 flex-wrap">
      <v-text-field
        v-model="fromDate"
        type="date"
        label="من تاريخ"
        density="compact"
        hide-details
        variant="outlined"
        style="max-width: 200px"
        clearable
      />
      <v-text-field
        v-model="toDate"
        type="date"
        label="إلى تاريخ"
        density="compact"
        hide-details
        variant="outlined"
        style="max-width: 200px"
        clearable
      />
      <v-btn color="primary" variant="tonal" :loading="accountingStore.loading" @click="refresh">
        عرض الميزانية
      </v-btn>
    </v-card-text>

    <!-- Summary cards -->
    <v-row dense class="px-4 mb-4">
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-caption">إجمالي الأصول</div>
            <div class="text-h6">
              {{ formatMoney(bs?.totalAssets ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="error">
          <v-card-text class="text-center">
            <div class="text-caption">إجمالي الالتزامات</div>
            <div class="text-h6">
              {{ formatMoney(bs?.totalLiabilities ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" color="info">
          <v-card-text class="text-center">
            <div class="text-caption">إجمالي حقوق الملكية</div>
            <div class="text-h6">
              {{ formatMoney(bs?.totalEquity ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Equity breakdown card -->
    <v-row dense class="px-4 mb-4">
      <v-col cols="12" md="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption">حسابات حقوق الملكية</div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ formatMoney(bs?.equityAccounts ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption">أرباح الفترة الحالية</div>
            <div
              class="text-subtitle-1 font-weight-medium"
              :class="(bs?.currentEarnings ?? 0) >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatMoney(bs?.currentEarnings ?? 0) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              إيرادات {{ formatMoney(bs?.revenueNet ?? 0) }} − مصروفات
              {{ formatMoney(bs?.expenseNet ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption">الفرق (يجب أن يكون ٠)</div>
            <div
              class="text-subtitle-1 font-weight-medium"
              :class="(bs?.difference ?? 0) === 0 ? 'text-success' : 'text-error'"
            >
              {{ formatMoney(bs?.difference ?? 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Balance equation check -->
    <v-row dense class="px-4 mb-4">
      <v-col cols="12">
        <v-alert :type="isBalanced ? 'success' : 'error'" variant="tonal" density="compact">
          <strong>معادلة الميزانية:</strong>
          الأصول ({{ formatMoney(bs?.totalAssets ?? 0) }})
          {{ isBalanced ? '=' : '≠' }}
          الالتزامات ({{ formatMoney(bs?.totalLiabilities ?? 0) }}) + حقوق الملكية ({{
            formatMoney(bs?.totalEquity ?? 0)
          }})
          <template v-if="!isBalanced"> — فرق: {{ formatMoney(bs?.difference ?? 0) }} </template>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Diagnostic alert when unbalanced -->
    <v-row v-if="bs && !isBalanced" dense class="px-4 mb-4">
      <v-col cols="12">
        <v-alert type="warning" variant="outlined" density="compact" closable>
          <strong>تشخيص عدم التوازن</strong>
          <div class="mt-1 text-body-2" dir="ltr" style="font-family: monospace">
            <div>Date range: {{ fromDate || '(all)' }} – {{ toDate || '(all)' }}</div>
            <div>Assets (debit nature) = {{ bs.totalAssets }}</div>
            <div>Liabilities (credit nature) = {{ bs.totalLiabilities }}</div>
            <div>Equity accounts (credit nature) = {{ bs.equityAccounts }}</div>
            <div>Revenue net = {{ bs.revenueNet }}</div>
            <div>Expense net = {{ bs.expenseNet }}</div>
            <div>Current earnings = {{ bs.currentEarnings }}</div>
            <div>Total equity = {{ bs.totalEquity }}</div>
            <div>
              <strong>Difference = {{ bs.difference }}</strong>
            </div>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Detailed sections -->
    <v-card-text v-if="bs">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-card class="mb-3">
            <v-card-title class="text-subtitle-2 font-weight-bold bg-primary-lighten-4">
              الأصول
            </v-card-title>
            <v-list density="compact">
              <v-list-item v-for="item in bs.assets || []" :key="item.accountId">
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ formatMoney(item.balance || 0) }}</span>
                </template>
              </v-list-item>
              <v-list-item v-if="!(bs.assets || []).length">
                <v-list-item-title class="text-medium-emphasis">لا توجد أصول</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="mb-3">
            <v-card-title class="text-subtitle-2 font-weight-bold bg-error-lighten-4">
              الالتزامات
            </v-card-title>
            <v-list density="compact">
              <v-list-item v-for="item in bs.liabilities || []" :key="item.accountId">
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ formatMoney(item.balance || 0) }}</span>
                </template>
              </v-list-item>
              <v-list-item v-if="!(bs.liabilities || []).length">
                <v-list-item-title class="text-medium-emphasis">لا توجد التزامات</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="mb-3">
            <v-card-title class="text-subtitle-2 font-weight-bold bg-info-lighten-4">
              حقوق الملكية
            </v-card-title>
            <v-list density="compact">
              <v-list-item v-for="item in bs.equity || []" :key="item.accountId">
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ formatMoney(item.balance || 0) }}</span>
                </template>
              </v-list-item>
              <!-- Current period earnings -->
              <v-list-item>
                <v-list-item-title class="font-italic"> أرباح الفترة الحالية </v-list-item-title>
                <template #append>
                  <span
                    class="font-weight-medium"
                    :class="(bs.currentEarnings ?? 0) >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatMoney(bs.currentEarnings ?? 0) }}
                  </span>
                </template>
              </v-list-item>
              <v-divider />
              <v-list-item>
                <v-list-item-title class="font-weight-bold">
                  إجمالي حقوق الملكية
                </v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ formatMoney(bs.totalEquity ?? 0) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { formatMoney } from '@/utils/formatters';
import { useAccountingStore } from '@/stores/accountingStore';

const accountingStore = useAccountingStore();

const fromDate = ref<string | null>(null);
const toDate = ref<string | null>(null);

const bs = computed(() => accountingStore.balanceSheet);

const isBalanced = computed(() => {
  if (!bs.value) return true;
  return bs.value.difference === 0;
});

async function refresh(): Promise<void> {
  await accountingStore.fetchBalanceSheet({
    fromDate: fromDate.value || undefined,
    toDate: toDate.value || undefined,
  });
}

onMounted(async () => {
  await accountingStore.fetchBalanceSheet();
});
</script>
