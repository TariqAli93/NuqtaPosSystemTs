<template>
  <v-container>
    <div class="win-page">
      <v-app-bar class="ds-page-header d-flex align-center justify-space-between mb-6">
        <template #prepend>
          <v-btn icon="mdi-arrow-right" variant="text" @click="router.back()" />
        </template>
        <v-app-bar-title>
          <div class="win-title mb-0">{{ isEdit ? t('customers.edit') : t('customers.new') }}</div>
          <div class="text-sm">{{ t('customers.formHint') }}</div>
        </v-app-bar-title>
      </v-app-bar>

      <v-card class="win-card win-card--padded" flat>
        <v-alert v-if="localizedError" type="error" variant="tonal" class="mb-4">
          {{ localizedError }}
        </v-alert>
        <v-form class="win-form" @submit.prevent="submit">
          <v-text-field v-model="form.name" :label="t('common.name')" required />
          <div class="d-flex flex-wrap ga-2">
            <v-text-field v-model="form.phone" :label="t('common.phone')" />
            <v-text-field v-model="form.city" :label="t('common.city')" />
          </div>
          <v-text-field v-model="form.address" :label="t('customers.address')" />
          <v-textarea v-model="form.notes" :label="t('common.notes')" rows="3" />
          <div class="d-flex ga-2">
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              class="win-btn"
              :loading="store.loading"
            >
              {{ t('common.save') }}
            </v-btn>
            <v-btn variant="text" class="win-ghost-btn" to="/customers">{{
              t('common.cancel')
            }}</v-btn>
          </div>
        </v-form>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mapErrorToArabic, t } from '../../i18n/t';
import { useCustomersStore } from '../../stores/customersStore';
import type { CustomerInput } from '../../types/domain';

const store = useCustomersStore();
const route = useRoute();
const router = useRouter();

const localizedError = computed(() =>
  store.error ? mapErrorToArabic(store.error, 'errors.unexpected') : null
);

const idParam = computed(() => route.params.id);
const isEdit = computed(() => typeof idParam.value === 'string');

const form = reactive<CustomerInput>({
  name: '',
  phone: null,
  address: null,
  city: null,
  notes: null,
});

async function loadCustomer() {
  if (!isEdit.value) return;
  const id = Number(idParam.value);
  if (Number.isNaN(id)) return;
  const result = await store.fetchCustomerById(id);
  if (result.ok && result.data) {
    form.name = result.data.name;
    form.phone = result.data.phone ?? null;
    form.address = result.data.address ?? null;
    form.city = result.data.city ?? null;
    form.notes = result.data.notes ?? null;
  }
}

async function submit() {
  if (isEdit.value) {
    const id = Number(idParam.value);
    if (Number.isNaN(id)) return;
    const result = await store.updateCustomer(id, form);
    if (result.ok) {
      await router.push('/customers');
    }
    return;
  }

  const result = await store.createCustomer(form);
  if (result.ok) {
    await router.push('/customers');
  }
}

onMounted(() => {
  void loadCustomer();
});
</script>
