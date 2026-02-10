<template>
  <v-sheet rounded="lg" border class="pa-2">
    <v-chip-group
      :model-value="selectedId"
      next-icon="mdi-chevron-right"
      prev-icon="mdi-chevron-left"
      show-arrows
      @update:model-value="$emit('select', $event)"
    >
      <v-chip
        v-for="category in categories"
        :key="category.id ?? 'all'"
        :value="category.id"
        filter
        size="small"
        variant="outlined"
        class="ma-1"
      >
        {{ category.name }}
      </v-chip>
    </v-chip-group>
  </v-sheet>
</template>

<script setup lang="ts">
interface CategoryItem {
  id: number | null;
  name: string;
}

interface Props {
  categories: CategoryItem[];
  selectedId?: number | null;
}

withDefaults(defineProps<Props>(), {
  selectedId: null,
});

defineEmits<{
  select: [id: number | null];
}>();
</script>
