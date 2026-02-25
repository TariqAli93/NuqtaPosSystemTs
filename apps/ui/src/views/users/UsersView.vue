<template>
  <v-container :fluid="props.embedded">
    <div class="win-page">
      <v-app-bar
        v-if="!props.embedded"
        class="ds-page-header d-flex align-center justify-space-between mb-6"
      >
        <v-app-bar-title>
          <div class="win-title mb-0">{{ t('users.title') }}</div>
          <div class="text-sm">{{ t('users.subtitle') }}</div>
        </v-app-bar-title>

        <template #append>
          <v-btn
            color="primary"
            @click="openCreateDialog"
            prepend-icon="mdi-plus"
            :disabled="!canCreate"
          >
            {{ t('users.add') }}
          </v-btn>
        </template>
      </v-app-bar>
      <div v-else class="d-flex justify-space-between align-center mb-4">
        <div class="text-subtitle-1 font-weight-bold">{{ t('users.title') }}</div>
        <v-btn
          color="primary"
          @click="openCreateDialog"
          prepend-icon="mdi-plus"
          :disabled="!canCreate"
        >
          {{ t('users.add') }}
        </v-btn>
      </div>

      <v-card class="win-card" flat>
        <v-card-text>
          <v-skeleton-loader v-if="loading" type="table" />
          <v-data-table
            v-else
            :headers="tableHeaders"
            :items="users"
            density="comfortable"
            :hide-default-footer="true"
          >
            <template #item.role="{ item }">
              {{ mapRoleToArabic(item.role) }}
            </template>
            <template #item.isActive="{ item }">
              <v-chip size="small" :color="item.isActive ? 'success' : 'warning'" variant="tonal">
                {{ item.isActive ? t('users.active') : t('users.inactive') }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                  :disabled="!canEdit"
                >
                  {{ t('common.edit') }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  :color="item.isActive ? 'warning' : 'success'"
                  :loading="togglingId === item.id"
                  :disabled="!canEdit"
                  @click="toggleUserState(item)"
                >
                  {{ item.isActive ? t('common.disable') : t('common.enable') }}
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-dialog v-model="dialogOpen" max-width="520">
        <v-card rounded="lg" class="pa-6">
          <v-card-title class="text-h6 pa-0">
            {{ isEditMode ? t('users.editDialog') : t('users.createDialog') }}
          </v-card-title>
          <v-card-text class="pa-0 mt-4">
            <v-form @submit.prevent="saveUser" class="d-flex flex-column ga-4">
              <v-text-field v-model="form.username" :label="t('users.username')" required />
              <v-text-field v-model="form.fullName" :label="t('users.fullName')" required />
              <v-text-field v-model="form.phone" :label="t('common.phone')" />
              <v-select
                v-model="form.role"
                :label="t('users.role')"
                :items="roleOptions"
                item-title="title"
                item-value="value"
                required
              />
              <v-text-field
                v-model="form.password"
                type="password"
                :label="t('users.password')"
                :hint="isEditMode ? t('users.passwordHint') : undefined"
                persistent-hint
                :required="!isEditMode"
              />
              <v-switch v-model="form.isActive" :label="t('users.active')" inset color="primary" />
            </v-form>
          </v-card-text>
          <v-card-actions class="pa-0 mt-6 justify-end ga-2">
            <v-btn variant="text" @click="closeDialog">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" @click="saveUser">
              {{ t('common.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { mapErrorToArabic, mapRoleToArabic, t } from '../../i18n/t';
import { usersClient } from '../../ipc';
import { useAuthStore } from '../../stores/authStore';
import type { UserInput, UserPublic, UserRole } from '../../types/domain';
import { notifyError, notifySuccess, notifyWarn } from '@/utils/notify';

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  {
    embedded: false,
  }
);

const authStore = useAuthStore();

const canCreate = computed(() => authStore.permissions.includes('users:create'));
const canEdit = computed(() => authStore.permissions.includes('users:update'));

const tableHeaders = computed(() => [
  { title: t('users.username'), key: 'username' },
  { title: t('users.fullName'), key: 'fullName' },
  { title: t('users.role'), key: 'role' },
  { title: t('users.state'), key: 'isActive' },
  { title: t('common.actions'), key: 'actions', sortable: false },
]);

type UserRow = UserPublic & {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
};

const users = ref<UserRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref<number | null>(null);
const togglingId = ref<number | null>(null);

const form = reactive<UserInput & { password: string }>({
  username: '',
  fullName: '',
  role: 'cashier',
  isActive: true,
  phone: null,
  password: '',
});

const isEditMode = computed(() => editingId.value !== null);

const roleOptions = computed(() => [
  { title: t('users.admin'), value: 'admin' },
  { title: t('users.manager'), value: 'manager' },
  { title: t('users.cashier'), value: 'cashier' },
  { title: t('users.viewer'), value: 'viewer' },
]);

function resetForm() {
  form.username = '';
  form.fullName = '';
  form.role = 'cashier';
  form.isActive = true;
  form.phone = null;
  form.password = '';
}

async function loadUsers() {
  loading.value = true;

  const result = await usersClient.getAll({});
  if (result.ok) {
    const data = result.data as unknown;
    users.value = Array.isArray(data)
      ? (data as UserRow[])
      : Array.isArray((data as { items?: unknown[] }).items)
        ? ((data as { items: UserRow[] }).items ?? [])
        : [];
  } else {
    notifyError(mapErrorToArabic(result.error, 'errors.loadFailed'));
  }

  loading.value = false;
}

function openCreateDialog() {
  editingId.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEditDialog(user: UserRow) {
  editingId.value = user.id;
  form.username = user.username;
  form.fullName = user.fullName;
  form.role = user.role;
  form.isActive = user.isActive;
  form.phone = user.phone ?? null;
  form.password = '';
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  editingId.value = null;
  resetForm();
}

async function saveUser() {
  if (!form.username.trim() || !form.fullName.trim()) {
    notifyWarn(t('errors.invalidData'));
    return;
  }

  if (!isEditMode.value && !form.password.trim()) {
    notifyWarn(t('errors.invalidData'));
    return;
  }

  saving.value = true;

  if (isEditMode.value && editingId.value !== null) {
    const payload: Partial<UserInput> = {
      username: form.username,
      fullName: form.fullName,
      role: form.role,
      isActive: form.isActive,
      phone: form.phone,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    const result = await usersClient.update(editingId.value, payload);
    if (!result.ok) {
      notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
      saving.value = false;
      return;
    }
  } else {
    const result = await usersClient.create({
      username: form.username,
      fullName: form.fullName,
      role: form.role,
      isActive: form.isActive,
      phone: form.phone,
      password: form.password,
    });

    if (!result.ok) {
      notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
      saving.value = false;
      return;
    }
  }

  saving.value = false;
  closeDialog();
  await loadUsers();
  notifySuccess(t('common.saved'));
}

async function toggleUserState(user: UserRow) {
  togglingId.value = user.id;

  const result = await usersClient.update(user.id, {
    isActive: !user.isActive,
  });

  if (!result.ok) {
    notifyError(mapErrorToArabic(result.error, 'errors.saveFailed'));
  } else {
    await loadUsers();
    notifySuccess(t('common.saved'));
  }

  togglingId.value = null;
}

onMounted(() => {
  void loadUsers();
});
</script>
