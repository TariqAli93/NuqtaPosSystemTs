<template>
  <div
    class="barcode-preview"
    :style="{
      width: scaledWidth + 'px',
      height: scaledHeight + 'px',
      border: '1px solid #ccc',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#fff',
      fontFamily: 'monospace',
    }"
  >
    <template v-for="el in elements" :key="el.id">
      <!-- Barcode element -->
      <div
        v-if="el.type === 'barcode'"
        :style="{
          position: 'absolute',
          left: scale(el.x) + 'px',
          top: scale(el.y) + 'px',
          width: scale(el.width || 30) + 'px',
          height: scale(el.height || 12) + 'px',
        }"
        class="preview-el preview-barcode"
      >
        <svg :width="scale(el.width || 30)" :height="scale(el.height || 12)" viewBox="0 0 120 40">
          <!-- Simplified barcode bars -->
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
      </div>

      <!-- Product name element -->
      <div
        v-else-if="el.type === 'productName'"
        :style="{
          position: 'absolute',
          left: scale(el.x) + 'px',
          top: scale(el.y) + 'px',
          fontSize: scale(el.fontSize || 8) + 'px',
          fontWeight: el.bold ? 'bold' : 'normal',
          color: '#000',
          whiteSpace: 'nowrap',
        }"
        class="preview-el"
      >
        {{ sampleProduct.name }}
      </div>

      <!-- Price element -->
      <div
        v-else-if="el.type === 'price'"
        :style="{
          position: 'absolute',
          left: scale(el.x) + 'px',
          top: scale(el.y) + 'px',
          fontSize: scale(el.fontSize || 10) + 'px',
          fontWeight: el.bold ? 'bold' : 'normal',
          color: '#000',
          whiteSpace: 'nowrap',
        }"
        class="preview-el"
      >
        {{ sampleProduct.price }}
      </div>

      <!-- Expiry element -->
      <div
        v-else-if="el.type === 'expiry'"
        :style="{
          position: 'absolute',
          left: scale(el.x) + 'px',
          top: scale(el.y) + 'px',
          fontSize: scale(el.fontSize || 7) + 'px',
          fontWeight: el.bold ? 'bold' : 'normal',
          color: '#666',
          whiteSpace: 'nowrap',
        }"
        class="preview-el"
      >
        {{ sampleProduct.expiry }}
      </div>
    </template>

    <!-- Empty state -->
    <div
      v-if="!elements.length"
      class="d-flex align-center justify-center fill-height text-medium-emphasis text-caption"
    >
      لا توجد عناصر
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface LayoutElement {
  id: string;
  type: 'barcode' | 'productName' | 'price' | 'expiry';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  bold?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** Label width in mm */
    labelWidth: number;
    /** Label height in mm */
    labelHeight: number;
    /** Scale factor (pixels per mm) */
    scaleFactor?: number;
    /** Elements to render */
    elements: LayoutElement[];
  }>(),
  {
    scaleFactor: 4,
  }
);

const sampleProduct = {
  name: 'منتج تجريبي',
  price: '25,000 د.ع',
  expiry: '2025-12-31',
};

const scaledWidth = computed(() => props.labelWidth * props.scaleFactor);
const scaledHeight = computed(() => props.labelHeight * props.scaleFactor);

function scale(mm: number): number {
  return mm * props.scaleFactor;
}
</script>

<style scoped>
.barcode-preview {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
.preview-el {
  user-select: none;
  pointer-events: none;
}
</style>
