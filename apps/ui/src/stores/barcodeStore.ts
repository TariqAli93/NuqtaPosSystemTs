import { defineStore } from 'pinia';
import { ref } from 'vue';
import { barcodeClient, type BarcodeTemplateInput, type PrintJobInput } from '../ipc/barcodeClient';
import type { BarcodeTemplate, BarcodePrintJob } from '@nuqtaplus/core';

export const useBarcodeStore = defineStore('barcode', () => {
  const templates = ref<BarcodeTemplate[]>([]);
  const printJobs = ref<BarcodePrintJob[]>([]);
  const printJobsTotal = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTemplates() {
    loading.value = true;
    error.value = null;
    const result = await barcodeClient.getTemplates();
    if (result.ok) templates.value = result.data;
    else error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function createTemplate(data: BarcodeTemplateInput) {
    loading.value = true;
    error.value = null;
    const result = await barcodeClient.createTemplate(data);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function fetchPrintJobs(params?: {
    productId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;
    const result = await barcodeClient.getPrintJobs(params);
    if (result.ok) {
      printJobs.value = result.data.items;
      printJobsTotal.value = result.data.total;
    } else {
      error.value = result.error.message;
    }
    loading.value = false;
    return result;
  }

  async function createPrintJob(data: PrintJobInput) {
    loading.value = true;
    const result = await barcodeClient.createPrintJob(data);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result;
  }

  async function deleteTemplate(id: number) {
    loading.value = true;
    error.value = null;
    const result = await barcodeClient.deleteTemplate(id);
    if (!result.ok) error.value = result.error.message;
    loading.value = false;
    return result.ok;
  }

  return {
    templates,
    printJobs,
    printJobsTotal,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    fetchPrintJobs,
    createPrintJob,
  };
});
