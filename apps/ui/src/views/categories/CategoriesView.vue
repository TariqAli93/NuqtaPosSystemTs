<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('categories.title') }}</div>
          <div class="text-sm">{{ t('categories.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn color="primary" @click="openCreateDialog" prepend-icon="mdi-plus">
            {{ t('categories.add') }}
          </v-btn>
        </template>
      </v-app-bar>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
        {{ error }}
      </v-alert>

      <v-card class="win-card" flat>
        <v-card-text class="pa-0">
          <v-skeleton-loader v-if="loading" type="table-row@3" class="ma-4" />

          <v-data-table
            v-else-if="categories.length > 0"
            :headers="tableHeaders"
            :items="categories"
            density="comfortable"
            class="ds-table-enhanced ds-table-striped"
            :hide-default-footer="true"
          >
            <template #item.name="{ item }">
              <div class="d-flex align-center ga-3">
                <v-avatar size="32" color="primary" variant="tonal">
                  <v-icon size="18">mdi-shape-outline</v-icon>
                </v-avatar>
                <span class="font-weight-medium">{{ item.name }}</span>
              </div>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="text"
                class="win-ghost-btn"
                prepend-icon="mdi-pencil"
                @click="openEditDialog(item)"
              >
                {{ t('common.edit') }}
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="error"
                prepend-icon="mdi-delete-outline"
                @click="openDeleteDialog(item)"
              >
                {{ t('common.delete') }}
              </v-btn>
            </template>
          </v-data-table>

          <EmptyState
            v-else
            icon="mdi-shape-outline"
            :title="t('categories.empty')"
            :description="t('categories.emptyHint')"
            :action-label="t('categories.add')"
            action-icon="mdi-plus"
            @action="openCreateDialog"
          />
        </v-card-text>
      </v-card>

      <v-dialog v-model="dialogOpen" max-width="500">
        <v-card rounded="lg" class="pa-6">
          <v-card-title class="text-h6 pa-0 mb-4">
            {{ editingId === null ? t('categories.dialogAdd') : t('categories.dialogEdit') }}
          </v-card-title>
          <v-card-text class="pa-0 mb-6">
            <v-text-field v-model="name" :label="t('categories.name')" required autofocus />
          </v-card-text>
          <v-card-actions class="pa-0">
            <v-spacer />
            <v-btn variant="text" @click="dialogOpen = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" @click="saveCategory">
              {{ t('common.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="deleteDialog" max-width="420">
        <v-card rounded="lg" class="pa-6">
          <v-card-title class="text-h6 pa-0 mb-4">{{ t('common.delete') }}</v-card-title>
          <v-card-text class="pa-0 mb-6">{{ t('categories.deleteConfirm') }}</v-card-text>
          <v-card-actions class="pa-0">
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">
              {{ t('common.delete') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { mapErrorToArabic, t } from '../../i18n/t';
import { categoriesClient } from '../../ipc';
import EmptyState from '../../components/emptyState.vue';
import type { Category } from '../../types/domain';

const tableHeaders = computed(() => [
  { title: t('categories.name'), key: 'name' },
  { title: '', key: 'actions', sortable: false, width: 180 },
]);

const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);

const dialogOpen = ref(false);
const deleteDialog = ref(false);
const editingId = ref<number | null>(null);
const deletingId = ref<number | null>(null);
const name = ref('');

async function loadCategories() {
  loading.value = true;
  error.value = null;

  const result = await categoriesClient.getAll({});
  if (result.ok) {
    const data = result.data as unknown;
    categories.value = Array.isArray(data) ? (data as Category[]) : [];
  } else {
    error.value = mapErrorToArabic(result.error, 'errors.loadFailed');
  }

  loading.value = false;
}

function openCreateDialog() {
  editingId.value = null;
  name.value = '';
  dialogOpen.value = true;
}

function openEditDialog(category: Category) {
  editingId.value = category.id ?? null;
  name.value = category.name;
  dialogOpen.value = true;
}

async function saveCategory() {
  if (!name.value.trim()) {
    error.value = t('errors.invalidData');
    return;
  }

  saving.value = true;
  error.value = null;

  if (editingId.value === null) {
    const result = await categoriesClient.create({
      name: name.value.trim(),
      description: null,
      isActive: true,
    });

    if (!result.ok) {
      error.value = mapErrorToArabic(result.error, 'errors.saveFailed');
      saving.value = false;
      return;
    }
  } else {
    const result = await categoriesClient.update(editingId.value, {
      name: name.value.trim(),
    });

    if (!result.ok) {
      error.value = mapErrorToArabic(result.error, 'errors.saveFailed');
      saving.value = false;
      return;
    }
  }

  saving.value = false;
  dialogOpen.value = false;
  await loadCategories();
}

function openDeleteDialog(category: Category) {
  deletingId.value = category.id ?? null;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (deletingId.value === null) {
    deleteDialog.value = false;
    return;
  }

  deleting.value = true;
  error.value = null;

  const result = await categoriesClient.delete(deletingId.value);
  if (!result.ok) {
    error.value = mapErrorToArabic(result.error, 'errors.deleteFailed');
  } else {
    await loadCategories();
  }

  deleting.value = false;
  deleteDialog.value = false;
  deletingId.value = null;
}

onMounted(() => {
  void loadCategories();
});
</script>
