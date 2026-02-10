<template>
  <section class="widget" :class="sizeClass">
    <header class="widget__header">
      <div>
        <div class="widget__title">{{ title }}</div>
        <div v-if="subtitle" class="widget__subtitle">{{ subtitle }}</div>
      </div>
      <slot name="header-actions" />
    </header>
    <div>
      <v-skeleton-loader v-if="loading" type="paragraph" />
      <slot v-else />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    loading?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    loading: false,
    size: 'md',
  }
);

const sizeClass = computed(() => `widget--${props.size}`);
</script>
