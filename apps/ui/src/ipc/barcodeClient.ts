import type { ApiResult, PagedResult } from './contracts';
import type { BarcodeTemplate, BarcodePrintJob } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildIdPayload, buildParamsPayload } from './payloads';

export type BarcodeTemplateInput = Pick<
  BarcodeTemplate,
  | 'name'
  | 'width'
  | 'height'
  | 'barcodeType'
  | 'showPrice'
  | 'showName'
  | 'showBarcode'
  | 'showExpiry'
  | 'isDefault'
>;

export interface PrintJobInput {
  templateId: number;
  productId: number;
  productName: string;
  barcode?: string;
  price?: number;
  expiryDate?: string;
  quantity: number;
}

export const barcodeClient = {
  getTemplates: (): Promise<ApiResult<BarcodeTemplate[]>> =>
    invoke<BarcodeTemplate[]>('barcode:getTemplates', {}),
  createTemplate: (data: BarcodeTemplateInput): Promise<ApiResult<BarcodeTemplate>> =>
    invoke<BarcodeTemplate>(
      'barcode:createTemplate',
      buildDataPayload('barcode:createTemplate', data as unknown as Record<string, unknown>)
    ),
  getPrintJobs: (params?: {
    productId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<BarcodePrintJob>>> =>
    invokePaged<BarcodePrintJob>(
      'barcode:getPrintJobs',
      buildParamsPayload('barcode:getPrintJobs', params)
    ),
  createPrintJob: (data: PrintJobInput): Promise<ApiResult<BarcodePrintJob>> =>
    invoke<BarcodePrintJob>(
      'barcode:createPrintJob',
      buildDataPayload('barcode:createPrintJob', data as unknown as Record<string, unknown>)
    ),
  deleteTemplate: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('barcode:deleteTemplate', buildIdPayload('barcode:deleteTemplate', id)),
};
