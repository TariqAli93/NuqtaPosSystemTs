import { ref } from 'vue';
import type { PagedResult } from '../../../ipc/contracts';
import { invokeOrThrow } from '../../../ipc/invoke';
import { buildParamsPayload } from '../../../ipc/payloads';
import { mapErrorToArabic } from '../../../i18n/t';
import type { Customer, Sale } from '../../../types/domain';

type MetricTrend = 'up' | 'down' | 'neutral';

type MetricValue = {
  value: number;
  trend?: MetricTrend;
  delta?: string;
};

type MetricsShape = {
  totalSales: MetricValue;
  revenueToday: MetricValue;
  activeCustomers: MetricValue;
  pendingOrders: MetricValue;
};

const SALES_PAGE_SIZE = 200;
const CUSTOMERS_PAGE_SIZE = 200;

const createMetric = (value = 0): MetricValue => ({
  value,
  trend: 'neutral',
});

const createDefaultMetrics = (): MetricsShape => ({
  totalSales: createMetric(0),
  revenueToday: createMetric(0),
  activeCustomers: createMetric(0),
  pendingOrders: createMetric(0),
});

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getTodayRange = () => {
  const day = new Date().toISOString().split('T')[0];
  return {
    startDate: `${day}T00:00:00.000Z`,
    endDate: `${day}T23:59:59.999Z`,
  };
};

const isPendingOrUnpaidSale = (sale: Sale): boolean => {
  const status = String(sale.status ?? '').toLowerCase();
  const remainingAmount = toNumber((sale as any).remainingAmount);
  if (status === 'pending') return true;
  if (status === 'cancelled') return false;
  return remainingAmount > 0;
};

const isActiveCustomer = (customer: Customer): boolean => (customer as any).isActive !== false;

async function fetchSalesPage(params: Record<string, unknown>): Promise<PagedResult<Sale>> {
  return invokeOrThrow<PagedResult<Sale>>(
    'sales:getAll',
    buildParamsPayload('sales:getAll', params)
  );
}

async function fetchCustomersPage(params: Record<string, unknown>): Promise<PagedResult<Customer>> {
  return invokeOrThrow<PagedResult<Customer>>(
    'customers:getAll',
    buildParamsPayload('customers:getAll', params)
  );
}

async function getSalesTotals(): Promise<{ totalSales: number; pendingOrders: number }> {
  let page = 1;
  let totalSales = 0;
  let pendingOrders = 0;

  while (true) {
    const pageResult = await fetchSalesPage({ page, limit: SALES_PAGE_SIZE });
    if (page === 1) {
      totalSales = toNumber(pageResult.total);
    }

    pendingOrders += pageResult.items.filter(isPendingOrUnpaidSale).length;

    if (pageResult.items.length === 0 || page * SALES_PAGE_SIZE >= totalSales) {
      break;
    }

    page += 1;
  }

  return { totalSales, pendingOrders };
}

async function getRevenueToday(): Promise<number> {
  const { startDate, endDate } = getTodayRange();

  let page = 1;
  let total = 0;
  let revenueToday = 0;

  while (true) {
    const pageResult = await fetchSalesPage({
      page,
      limit: SALES_PAGE_SIZE,
      startDate,
      endDate,
    });

    if (page === 1) {
      total = toNumber(pageResult.total);
    }

    for (const sale of pageResult.items) {
      if (String(sale.status ?? '').toLowerCase() === 'cancelled') continue;
      revenueToday += toNumber(sale.total);
    }

    if (pageResult.items.length === 0 || page * SALES_PAGE_SIZE >= total) {
      break;
    }

    page += 1;
  }

  return revenueToday;
}

async function getActiveCustomersCount(): Promise<number> {
  let offset = 0;
  let total = 0;
  let activeCustomers = 0;

  while (true) {
    const pageResult = await fetchCustomersPage({ limit: CUSTOMERS_PAGE_SIZE, offset });
    if (offset === 0) {
      total = toNumber(pageResult.total);
    }

    activeCustomers += pageResult.items.filter(isActiveCustomer).length;

    if (pageResult.items.length === 0 || offset + CUSTOMERS_PAGE_SIZE >= total) {
      break;
    }

    offset += CUSTOMERS_PAGE_SIZE;
  }

  return activeCustomers;
}

export function useDashboardMetrics() {
  const metrics = ref<MetricsShape>(createDefaultMetrics());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const refresh = async (): Promise<void> => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      const [salesTotals, revenueToday, activeCustomers] = await Promise.all([
        getSalesTotals(),
        getRevenueToday(),
        getActiveCustomersCount(),
      ]);

      metrics.value = {
        totalSales: createMetric(salesTotals.totalSales),
        revenueToday: createMetric(revenueToday),
        activeCustomers: createMetric(activeCustomers),
        pendingOrders: createMetric(salesTotals.pendingOrders),
      };
    } catch (err) {
      error.value = mapErrorToArabic(err, 'errors.loadFailed');
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}
