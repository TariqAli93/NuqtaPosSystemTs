<template>
  <div class="win-page">
    <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
      <v-app-bar-title>
        <div class="win-title mb-0">{{ t('dashboard.title') }}</div>
        <div class="text-sm">{{ t('dashboard.subtitle') }}</div>
      </v-app-bar-title>
    </v-app-bar>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <!-- Simple Metrics Grid -->
    <v-row class="mb-6">
      <v-col v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-caption text-medium-emphasis mb-2">{{ kpi.label }}</div>
          <div class="text-h5 font-weight-medium mb-1">{{ kpi.value }}</div>
          <div class="d-flex align-center text-caption">
            <v-icon
              :icon="
                kpi.trend === 'up'
                  ? 'mdi-arrow-up'
                  : kpi.trend === 'down'
                    ? 'mdi-arrow-down'
                    : 'mdi-minus'
              "
              :color="kpi.trend === 'up' ? 'success' : kpi.trend === 'down' ? 'error' : 'grey'"
              size="16"
              class="mr-1"
            />
            <span
              :class="
                kpi.trend === 'up'
                  ? 'text-success'
                  : kpi.trend === 'down'
                    ? 'text-error'
                    : 'text-grey'
              "
            >
              {{ kpi.delta || t('dashboard.trend.neutral') }}
            </span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Analytics Table -->
    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1 font-weight-medium py-3">
        {{ t('dashboard.analytics') }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-0">
        <v-data-table
          :headers="analyticsHeaders"
          :items="analyticsRows"
          density="compact"
          :hide-default-footer="true"
        >
          <template #item.value="{ item }">
            <span class="text-right">{{ item.value }}</span>
          </template>
          <template #item.delta="{ item }">
            <span :class="item.trendClass">
              {{ item.delta }}
            </span>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Simple Chart Placeholder -->
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-medium py-3">
        {{ t('dashboard.salesVelocity') }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1">mdi-chart-line</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          {{ t('dashboard.chartPlaceholder') }}
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { t } from '../../i18n/t';
import { useDashboardMetrics } from './providers/useDashboardMetrics';

const { metrics, loading, error, refresh } = useDashboardMetrics();
let refreshTimer: number | null = null;

const formatCount = (value: number): string => new Intl.NumberFormat('ar-IQ').format(value);
const formatAmount = (value: number): string =>
  new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const kpis = computed(() => [
  {
    label: t('dashboard.totalSales'),
    value: formatCount(metrics.value.totalSales.value),
    trend: metrics.value.totalSales.trend ?? 'neutral',
    delta: metrics.value.totalSales.delta,
  },
  {
    label: t('dashboard.activeCustomers'),
    value: formatCount(metrics.value.activeCustomers.value),
    trend: metrics.value.activeCustomers.trend ?? 'neutral',
    delta: metrics.value.activeCustomers.delta,
  },
  {
    label: t('dashboard.revenueToday'),
    value: formatAmount(metrics.value.revenueToday.value),
    trend: metrics.value.revenueToday.trend ?? 'neutral',
    delta: metrics.value.revenueToday.delta,
  },
  {
    label: t('dashboard.pendingOrders'),
    value: formatCount(metrics.value.pendingOrders.value),
    trend: metrics.value.pendingOrders.trend ?? 'neutral',
    delta: metrics.value.pendingOrders.delta,
  },
]);

const analyticsHeaders = computed(() => [
  { title: t('dashboard.metric'), key: 'metric' },
  { title: t('dashboard.metricValue'), key: 'value', align: 'end' as const },
  { title: t('dashboard.metricChange'), key: 'delta', align: 'end' as const },
]);

const analyticsRows = computed(() => [
  {
    metric: t('dashboard.totalSales'),
    value: formatCount(metrics.value.totalSales.value),
    delta: metrics.value.totalSales.delta || '-',
    trendClass: metrics.value.totalSales.trend === 'up' ? 'text-success' : 'text-error',
  },
  {
    metric: t('dashboard.activeCustomers'),
    value: formatCount(metrics.value.activeCustomers.value),
    delta: metrics.value.activeCustomers.delta || '-',
    trendClass: metrics.value.activeCustomers.trend === 'up' ? 'text-success' : 'text-error',
  },
  {
    metric: t('dashboard.revenueToday'),
    value: formatAmount(metrics.value.revenueToday.value),
    delta: metrics.value.revenueToday.delta || '-',
    trendClass: metrics.value.revenueToday.trend === 'up' ? 'text-success' : 'text-error',
  },
  {
    metric: t('dashboard.pendingOrders'),
    value: formatCount(metrics.value.pendingOrders.value),
    delta: metrics.value.pendingOrders.delta || '-',
    trendClass: metrics.value.pendingOrders.trend === 'up' ? 'text-warning' : 'text-success',
  },
]);

onMounted(() => {
  void refresh();
  refreshTimer = window.setInterval(() => {
    void refresh();
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
  }
});
</script>
