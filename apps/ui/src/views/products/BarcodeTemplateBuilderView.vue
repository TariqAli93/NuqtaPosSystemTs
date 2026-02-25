<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="mb-4" align="center">
      <v-col>
        <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" class="me-2" />
        <span class="text-h5 font-weight-bold">مصمم قوالب الباركود</span>
      </v-col>
    </v-row>

    <v-row>
      <!-- Left: Template List -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-subtitle-1">القوالب</span>
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="newTemplate"
            >
              جديد
            </v-btn>
          </v-card-title>
          <v-divider />

          <v-list v-if="barcodeStore.templates.length" density="compact">
            <v-list-item
              v-for="tmpl in barcodeStore.templates"
              :key="tmpl.id"
              :active="selectedTemplateId === tmpl.id"
              @click="selectTemplate(tmpl)"
              class="py-2"
            >
              <template #prepend>
                <v-icon>mdi-file-document-outline</v-icon>
              </template>
              <v-list-item-title>{{ tmpl.name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ tmpl.width }} x {{ tmpl.height }} مم —
                {{ tmpl.barcodeType }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip v-if="tmpl.isDefault" size="x-small" color="primary" variant="tonal">
                  افتراضي
                </v-chip>
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click.stop="deleteTemplate(tmpl.id!)"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-card-text v-else class="text-center text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-barcode-off</v-icon>
            <p>لا توجد قوالب</p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Center: Canvas Editor -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-subtitle-1">منطقة التصميم</span>
            <div class="d-flex ga-2">
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-content-save"
                :loading="saving"
                :disabled="!isDirty"
                @click="saveTemplate"
              >
                حفظ
              </v-btn>
            </div>
          </v-card-title>
          <v-divider />

          <v-card-text>
            <!-- Label dimensions -->
            <v-row dense class="mb-3">
              <v-col cols="4">
                <v-text-field
                  v-model="form.name"
                  label="اسم القالب"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model.number="form.width"
                  label="العرض (مم)"
                  type="number"
                  min="20"
                  max="200"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model.number="form.height"
                  label="الارتفاع (مم)"
                  type="number"
                  min="10"
                  max="100"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="2">
                <v-select
                  v-model="form.barcodeType"
                  :items="barcodeTypes"
                  label="النوع"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="2">
                <v-switch
                  v-model="form.isDefault"
                  label="افتراضي"
                  density="compact"
                  hide-details
                  color="primary"
                />
              </v-col>
            </v-row>

            <!-- Element toolbar -->
            <div class="d-flex ga-2 mb-3 flex-wrap">
              <v-btn
                v-for="elType in elementTypes"
                :key="elType.type"
                size="small"
                variant="outlined"
                :prepend-icon="elType.icon"
                @click="addElement(elType.type)"
              >
                {{ elType.label }}
              </v-btn>
              <v-spacer />
              <v-btn
                v-if="selectedElementId"
                size="small"
                variant="tonal"
                color="error"
                prepend-icon="mdi-delete"
                @click="removeSelectedElement"
              >
                حذف العنصر
              </v-btn>
            </div>

            <!-- Canvas -->
            <div
              class="canvas-wrapper d-flex justify-center py-4"
              style="background: #f5f5f5; border-radius: 8px"
            >
              <div
                ref="canvasRef"
                class="canvas-area"
                :style="{
                  width: form.width * SCALE + 'px',
                  height: form.height * SCALE + 'px',
                  position: 'relative',
                  border: '2px dashed #bbb',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  cursor: 'default',
                }"
                @mousedown.self="deselectElement"
              >
                <div
                  v-for="el in layoutElements"
                  :key="el.id"
                  :class="[
                    'canvas-element',
                    { 'canvas-element--selected': selectedElementId === el.id },
                  ]"
                  :style="{
                    position: 'absolute',
                    left: el.x * SCALE + 'px',
                    top: el.y * SCALE + 'px',
                    width: (el.width || 30) * SCALE + 'px',
                    minHeight: el.type === 'barcode' ? (el.height || 12) * SCALE + 'px' : 'auto',
                    fontSize: (el.fontSize || 8) * SCALE + 'px',
                    fontWeight: el.bold ? 'bold' : 'normal',
                    cursor: 'grab',
                    userSelect: 'none',
                    border: selectedElementId === el.id ? '2px solid #1976D2' : '1px dashed #aaa',
                    borderRadius: '2px',
                    padding: '2px',
                    backgroundColor:
                      selectedElementId === el.id ? 'rgba(25,118,210,0.05)' : 'transparent',
                  }"
                  @mousedown.stop="startDrag($event, el)"
                  @click.stop="selectElement(el.id)"
                >
                  <!-- Barcode placeholder -->
                  <template v-if="el.type === 'barcode'">
                    <svg
                      :width="(el.width || 30) * SCALE"
                      :height="(el.height || 12) * SCALE"
                      :viewBox="'0 0 120 40'"
                      class="d-block"
                    >
                      <rect
                        v-for="i in 30"
                        :key="i"
                        :x="i * 4"
                        y="0"
                        :width="i % 3 === 0 ? 3 : 1.5"
                        height="40"
                        fill="#000"
                      />
                    </svg>
                  </template>
                  <template v-else-if="el.type === 'productName'">
                    <span>منتج تجريبي</span>
                  </template>
                  <template v-else-if="el.type === 'price'">
                    <span>25,000 د.ع</span>
                  </template>
                  <template v-else-if="el.type === 'expiry'">
                    <span>2025-12-31</span>
                  </template>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right: Properties Panel -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title class="text-subtitle-1"> خصائص العنصر </v-card-title>
          <v-divider />

          <v-card-text v-if="selectedElement">
            <v-chip size="small" class="mb-3" color="primary" variant="tonal">
              {{ elementTypeLabel(selectedElement.type) }}
            </v-chip>

            <v-text-field
              v-model.number="selectedElement.x"
              label="X (مم)"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              class="mb-2"
              hide-details
              @update:model-value="markDirty"
            />
            <v-text-field
              v-model.number="selectedElement.y"
              label="Y (مم)"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              class="mb-2"
              hide-details
              @update:model-value="markDirty"
            />

            <template v-if="selectedElement.type === 'barcode'">
              <v-text-field
                v-model.number="selectedElement.width"
                label="العرض (مم)"
                type="number"
                min="5"
                variant="outlined"
                density="compact"
                class="mb-2"
                hide-details
                @update:model-value="markDirty"
              />
              <v-text-field
                v-model.number="selectedElement.height"
                label="الارتفاع (مم)"
                type="number"
                min="5"
                variant="outlined"
                density="compact"
                class="mb-2"
                hide-details
                @update:model-value="markDirty"
              />
            </template>

            <template v-else>
              <v-text-field
                v-model.number="selectedElement.fontSize"
                label="حجم الخط (مم)"
                type="number"
                min="3"
                max="30"
                variant="outlined"
                density="compact"
                class="mb-2"
                hide-details
                @update:model-value="markDirty"
              />
              <v-switch
                v-model="selectedElement.bold"
                label="خط عريض"
                color="primary"
                density="compact"
                hide-details
                @update:model-value="markDirty"
              />
            </template>
          </v-card-text>

          <v-card-text v-else class="text-center text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-cursor-default-click-outline</v-icon>
            <p>اختر عنصراً لتعديل خصائصه</p>
          </v-card-text>
        </v-card>

        <!-- Live Preview Card -->
        <v-card class="mt-4">
          <v-card-title class="text-subtitle-1">
            <v-icon size="small" class="me-1">mdi-eye</v-icon>
            معاينة مباشرة
          </v-card-title>
          <v-divider />
          <v-card-text class="d-flex justify-center pa-4">
            <BarcodePreview
              :label-width="form.width"
              :label-height="form.height"
              :elements="layoutElements"
              :scale-factor="3"
            />
          </v-card-text>
        </v-card>

        <!-- Toggle visibility -->
        <v-card class="mt-4">
          <v-card-title class="text-subtitle-1">عناصر الإظهار</v-card-title>
          <v-divider />
          <v-card-text>
            <v-switch
              v-model="form.showBarcode"
              label="الباركود"
              color="primary"
              density="compact"
              hide-details
              class="mb-1"
            />
            <v-switch
              v-model="form.showName"
              label="اسم المنتج"
              color="primary"
              density="compact"
              hide-details
              class="mb-1"
            />
            <v-switch
              v-model="form.showPrice"
              label="السعر"
              color="primary"
              density="compact"
              hide-details
              class="mb-1"
            />
            <v-switch
              v-model="form.showExpiry"
              label="تاريخ الانتهاء"
              color="primary"
              density="compact"
              hide-details
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBarcodeStore } from '../../stores/barcodeStore';
import BarcodePreview from '../../components/barcode/BarcodePreview.vue';
import type { LayoutElement } from '../../components/barcode/BarcodePreview.vue';
import type { BarcodeTemplate } from '@nuqtaplus/core';

const router = useRouter();
const barcodeStore = useBarcodeStore();

const SCALE = 4; // px per mm

const barcodeTypes = [
  { title: 'CODE128', value: 'CODE128' },
  { title: 'EAN13', value: 'EAN13' },
  { title: 'QR', value: 'QR' },
];

const elementTypes = [
  { type: 'barcode' as const, label: 'باركود', icon: 'mdi-barcode' },
  { type: 'productName' as const, label: 'اسم المنتج', icon: 'mdi-text' },
  { type: 'price' as const, label: 'السعر', icon: 'mdi-currency-usd' },
  { type: 'expiry' as const, label: 'تاريخ الانتهاء', icon: 'mdi-calendar-clock' },
];

// Form state
const form = reactive({
  name: '',
  width: 50,
  height: 30,
  barcodeType: 'CODE128' as 'CODE128' | 'EAN13' | 'QR',
  showPrice: true,
  showName: true,
  showBarcode: true,
  showExpiry: false,
  isDefault: false,
});

const layoutElements = ref<LayoutElement[]>([]);
const selectedTemplateId = ref<number | null>(null);
const selectedElementId = ref<string | null>(null);
const isDirty = ref(false);
const saving = ref(false);
const canvasRef = ref<HTMLDivElement | null>(null);

// Drag state
let dragState: {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElX: number;
  startElY: number;
} | null = null;

const selectedElement = computed(() => {
  if (!selectedElementId.value) return null;
  return layoutElements.value.find((el) => el.id === selectedElementId.value) || null;
});

function elementTypeLabel(type: string): string {
  const map: Record<string, string> = {
    barcode: 'باركود',
    productName: 'اسم المنتج',
    price: 'السعر',
    expiry: 'تاريخ الانتهاء',
  };
  return map[type] || type;
}

function markDirty() {
  isDirty.value = true;
}

function generateId(): string {
  return 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
}

// Template management
function newTemplate() {
  selectedTemplateId.value = null;
  form.name = '';
  form.width = 50;
  form.height = 30;
  form.barcodeType = 'CODE128';
  form.showPrice = true;
  form.showName = true;
  form.showBarcode = true;
  form.showExpiry = false;
  form.isDefault = false;
  layoutElements.value = [];
  selectedElementId.value = null;
  isDirty.value = false;
}

function selectTemplate(tmpl: BarcodeTemplate) {
  selectedTemplateId.value = tmpl.id ?? null;
  form.name = tmpl.name;
  form.width = tmpl.width;
  form.height = tmpl.height;
  form.barcodeType = tmpl.barcodeType as 'CODE128' | 'EAN13' | 'QR';
  form.showPrice = tmpl.showPrice ?? true;
  form.showName = tmpl.showName ?? true;
  form.showBarcode = tmpl.showBarcode ?? true;
  form.showExpiry = tmpl.showExpiry ?? false;
  form.isDefault = tmpl.isDefault ?? false;

  // Parse layoutJson
  if (tmpl.layoutJson) {
    try {
      const parsed = JSON.parse(tmpl.layoutJson);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.elements)) {
        layoutElements.value = parsed.elements;
      } else {
        layoutElements.value = [];
      }
    } catch {
      layoutElements.value = [];
    }
  } else {
    // Generate default layout from show* flags
    layoutElements.value = buildDefaultLayout(tmpl);
  }

  selectedElementId.value = null;
  isDirty.value = false;
}

function buildDefaultLayout(tmpl: BarcodeTemplate): LayoutElement[] {
  const els: LayoutElement[] = [];
  let yOffset = 2;

  if (tmpl.showBarcode) {
    els.push({
      id: generateId(),
      type: 'barcode',
      x: 2,
      y: yOffset,
      width: tmpl.width - 4,
      height: Math.min(12, tmpl.height * 0.4),
    });
    yOffset += Math.min(14, tmpl.height * 0.4 + 2);
  }
  if (tmpl.showName) {
    els.push({
      id: generateId(),
      type: 'productName',
      x: 2,
      y: yOffset,
      fontSize: 6,
    });
    yOffset += 7;
  }
  if (tmpl.showPrice) {
    els.push({
      id: generateId(),
      type: 'price',
      x: 2,
      y: yOffset,
      fontSize: 8,
      bold: true,
    });
    yOffset += 9;
  }
  if (tmpl.showExpiry) {
    els.push({
      id: generateId(),
      type: 'expiry',
      x: 2,
      y: yOffset,
      fontSize: 5,
    });
  }

  return els;
}

async function deleteTemplate(id: number) {
  const res = await barcodeStore.deleteTemplate(id);
  if (res) {
    if (selectedTemplateId.value === id) {
      newTemplate();
    }
    await barcodeStore.fetchTemplates();
  }
}

async function saveTemplate() {
  if (!form.name) return;

  saving.value = true;
  try {
    const layoutJson = JSON.stringify({ version: 1, elements: layoutElements.value });

    // Since updateTemplate is not wired via IPC, we always create new
    // (delete old first if editing)
    if (selectedTemplateId.value) {
      await barcodeStore.deleteTemplate(selectedTemplateId.value);
    }

    const res = await barcodeStore.createTemplate({
      name: form.name,
      width: form.width,
      height: form.height,
      barcodeType: form.barcodeType,
      showPrice: form.showPrice,
      showName: form.showName,
      showBarcode: form.showBarcode,
      showExpiry: form.showExpiry,
      isDefault: form.isDefault,
      layoutJson,
    });

    if (res.ok) {
      selectedTemplateId.value = res.data.id ?? null;
      isDirty.value = false;
    }

    await barcodeStore.fetchTemplates();
  } finally {
    saving.value = false;
  }
}

// Element operations
function addElement(type: LayoutElement['type']) {
  const el: LayoutElement = {
    id: generateId(),
    type,
    x: 5,
    y: 5,
    ...(type === 'barcode'
      ? { width: 30, height: 12 }
      : { fontSize: type === 'price' ? 10 : type === 'expiry' ? 6 : 8 }),
    ...(type === 'price' ? { bold: true } : {}),
  };
  layoutElements.value.push(el);
  selectedElementId.value = el.id;
  markDirty();
}

function removeSelectedElement() {
  if (!selectedElementId.value) return;
  layoutElements.value = layoutElements.value.filter((el) => el.id !== selectedElementId.value);
  selectedElementId.value = null;
  markDirty();
}

function selectElement(id: string) {
  selectedElementId.value = id;
}

function deselectElement() {
  selectedElementId.value = null;
}

// Drag & Drop
function startDrag(event: MouseEvent, el: LayoutElement) {
  selectedElementId.value = el.id;
  dragState = {
    elementId: el.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startElX: el.x,
    startElY: el.y,
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!dragState) return;

  const dx = (event.clientX - dragState.startMouseX) / SCALE;
  const dy = (event.clientY - dragState.startMouseY) / SCALE;

  const el = layoutElements.value.find((e) => e.id === dragState!.elementId);
  if (!el) return;

  el.x = Math.max(0, Math.min(form.width - (el.width || 10), Math.round(dragState.startElX + dx)));
  el.y = Math.max(0, Math.min(form.height - (el.height || 5), Math.round(dragState.startElY + dy)));
  markDirty();
}

function stopDrag() {
  dragState = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

onMounted(async () => {
  await barcodeStore.fetchTemplates();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped>
.canvas-element {
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.canvas-element:hover {
  border-color: #1976d2 !important;
}
.canvas-element--selected {
  z-index: 10;
}
</style>
