<template>
  <div class="kpi-card ds-card-elevated" :style="cardStyle as any">
    <div class="kpi-card__content">
      <div class="kpi-card__label">{{ label }}</div>
      <div class="kpi-card__value">{{ value }}</div>
      <div class="kpi-card__trend" :class="`kpi-card__trend--${trend}`">
        <v-icon size="18" class="mr-1">{{ trendIcon }}</v-icon>
        <span class="font-weight-medium">{{ trendText }}</span>
        <span v-if="delta" class="text-caption ml-1">({{ delta }})</span>
      </div>
    </div>
    <div class="kpi-card__accent" :style="accentBarStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../../i18n/t';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    delta?: string;
    accent?: string;
  }>(),
  {
    trend: 'neutral',
  }
);

const trendIcon = computed(() => {
  if (props.trend === 'up') return 'mdi-trending-up';
  if (props.trend === 'down') return 'mdi-trending-down';
  return 'mdi-minus';
});

const trendText = computed(() => {
  if (props.trend === 'up') return t('dashboard.trend.up');
  if (props.trend === 'down') return t('dashboard.trend.down');
  return t('dashboard.trend.neutral');
});

const cardStyle = computed(() => ({
  position: 'relative',
  overflow: 'hidden',
}));

const accentBarStyle = computed(() => ({
  background: props.accent || '#2563eb',
}));
</script>

<style scoped lang="scss">
.kpi-card {
  padding: var(--ds-spacing-lg);
  border-radius: var(--ds-radius-xl);
  transition: all var(--ds-transition-base);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--ds-shadow-lg);
  }

  &__content {
    position: relative;
    z-index: 1;
  }

  &__label {
    font-size: var(--ds-font-size-sm);
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-weight: var(--ds-font-weight-medium);
    margin-bottom: var(--ds-spacing-sm);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__value {
    font-size: var(--ds-font-size-3xl);
    font-weight: var(--ds-font-weight-bold);
    color: rgb(var(--v-theme-on-surface));
    line-height: var(--ds-line-height-tight);
    margin-bottom: var(--ds-spacing-md);
  }

  &__trend {
    display: flex;
    align-items: center;
    font-size: var(--ds-font-size-sm);
    gap: var(--ds-spacing-xs);

    &--up {
      color: #059669;
    }

    &--down {
      color: #dc2626;
    }

    &--neutral {
      color: rgba(var(--v-theme-on-surface), 0.5);
    }
  }

  &__accent {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 0 0 var(--ds-radius-xl) var(--ds-radius-xl);
  }
}
</style>
