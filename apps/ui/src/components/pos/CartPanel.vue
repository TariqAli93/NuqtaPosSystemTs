<template>
  <v-navigation-drawer
    permanent
    mobile-breakpoint="md"
    retain-focus
    class="pa-0 resizable-drawer border-b-0 border-t-0"
    :width="drawerWidth"
    :location="drawerLocation"
  >
    <v-card flat rounded="0" border="0">
      <v-card-title class="d-flex align-center justify-space-between pa-4" style="min-height: 72px">
        <span class="font-weight-medium">{{ t('pos.cart') }}</span>
        <v-chip size="small" variant="tonal" color="primary">
          {{ items.length }} {{ t('common.items') }}
        </v-chip>
      </v-card-title>

      <v-card-text class="overflow-y-auto pa-0">
        <v-list v-if="items.length > 0" density="comfortable" bg-color="transparent" class="py-2">
          <v-list-item v-for="(item, index) in items" :key="index" min-height="72" class="px-4">
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ item.productName }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption text-medium-emphasis mt-1">
              <template v-if="getUnitsForIndex(index).length > 1">
                <v-menu>
                  <template #activator="{ props: menuProps }">
                    <v-chip
                      v-bind="menuProps"
                      size="x-small"
                      variant="outlined"
                      color="primary"
                      class="cursor-pointer"
                      append-icon="mdi-chevron-down"
                    >
                      {{ item.unitName }}
                    </v-chip>
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      v-for="unit in getUnitsForIndex(index)"
                      :key="unit.unitName"
                      :active="unit.unitName === item.unitName"
                      @click="$emit('unitChange', { index, unit })"
                    >
                      <v-list-item-title class="text-body-2">
                        {{ unit.unitName }}
                        <span
                          v-if="unit.sellingPrice != null"
                          class="text-caption text-medium-emphasis mr-2"
                        >
                          ({{ formatPrice(unit.sellingPrice) }})
                        </span>
                      </v-list-item-title>
                      <v-list-item-subtitle v-if="unit.factorToBase > 1" class="text-caption">
                        × {{ unit.factorToBase }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-menu>
                <span class="mr-1">·</span>
              </template>
              <template
                v-else-if="item.unitName && item.unitName !== 'pcs' && item.unitName !== 'piece'"
              >
                <v-chip size="x-small" variant="tonal" class="ml-1">{{ item.unitName }}</v-chip>
                <span class="mr-1">·</span>
              </template>
              {{ formatPrice(item.unitPrice) }} {{ t('pos.each') }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center ga-2">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="$emit('decrease', index)"
                >
                  <v-icon size="18">mdi-minus</v-icon>
                </v-btn>

                <v-sheet rounded="md" class="px-3 py-1">
                  <v-text-field
                    :model-value="item.quantity"
                    max-width="120"
                    width="65"
                    hide-details
                    variant="solo-filled"
                    density="compact"
                    counter
                    :readonly="true"
                  />
                </v-sheet>

                <v-btn
                  icon
                  size="small"
                  variant="text"
                  density="comfortable"
                  @click="$emit('increase', index)"
                >
                  <v-icon size="18">mdi-plus</v-icon>
                </v-btn>

                <span class="text-body-2 font-weight-bold text-no-wrap" style="max-width: 45px">
                  {{ formatPrice(itemSubtotal(item)) }}
                </span>

                <v-btn
                  icon
                  variant="text"
                  density="comfortable"
                  @click="$emit('remove', index)"
                  class="mr-4"
                >
                  <v-icon size="18" color="error">mdi-close</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-sheet v-else class="d-flex flex-column align-center justify-center px-6 py-8">
          <v-icon size="56" color="grey-lighten-2">mdi-cart-outline</v-icon>
          <div class="text-subtitle-1 mt-4 text-medium-emphasis">{{ t('pos.cartEmpty') }}</div>
          <div class="text-body-2 text-center text-medium-emphasis mt-2">
            {{ t('pos.cartEmptyHint') }}
          </div>
        </v-sheet>
      </v-card-text>
    </v-card>

    <template #append>
      <v-card border="0" class="px-0">
        <v-card-title>
          <slot name="totals"></slot>
        </v-card-title>

        <v-card-text>
          <slot name="actions"></slot>
        </v-card-text>
      </v-card>
    </template>

    <!-- Handle للسحب -->
    <div
      class="drawer-resize-handle"
      :class="{ right: drawerLocation === 'right' }"
      @mousedown.prevent="onMouseDown"
    />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { t } from '@/i18n/t';
import type { SaleItem, ProductUnit } from '@/types/domain';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useLayoutStore } from '@/stores/layout';

interface Props {
  items: SaleItem[];
  unitsMap?: Map<number, ProductUnit[]>;
}

const props = withDefaults(defineProps<Props>(), {
  unitsMap: () => new Map(),
});

const layout = useLayoutStore();

const isDragging = ref(false);
const startX = ref(0);
const startWidth = ref(0);

// RTL support: إذا drawer على اليمين، السحب لازم يعكس الاتجاه
const drawerLocation = ref<'left' | 'right'>('left'); // غيّرها حسب مشروعك
const isRight = computed(() => drawerLocation.value === 'right');

const emit = defineEmits<{
  increase: [index: number];
  decrease: [index: number];
  remove: [index: number];
  setQuantity: [{ index: number; quantity: number }];
  resetQuantityInput: [index: number];
  unitChange: [{ index: number; unit: ProductUnit }];
}>();

function getUnitsForIndex(index: number): ProductUnit[] {
  return props.unitsMap?.get(index) ?? [];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(price);
};

const itemSubtotal = (item: SaleItem) => {
  return Math.max(0, item.quantity * item.unitPrice - (item.discount || 0));
};

const drawerWidth = computed(() => layout.drawerWidth);

function onMouseDown(e: MouseEvent) {
  isDragging.value = true;
  startX.value = e.clientX;
  startWidth.value = drawerWidth.value;

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - startX.value;
  const next = isRight.value ? startWidth.value - dx : startWidth.value + dx;
  layout.setDrawerWidth(next);
}

function onMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>
<style scoped>
.resizable-drawer {
  position: relative;
}

:deep(.resizable-drawer) {
  border: 0 !important;
}

/* شريط السحب */
.drawer-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  right: -4px; /* default: drawer على اليسار => السحب من اليمين */
  cursor: col-resize;
  z-index: 10;
}

/* إذا drawer على اليمين، خلي handle على اليسار */
.drawer-resize-handle.right {
  left: -4px;
  right: auto;
}

/* تحسين UX: خلي جزء "اللمس" أكبر بس بدون ما يبين */
.drawer-resize-handle::after {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
}

:deep(.v-navigation-drawer--right) {
  border: 0 !important;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
