import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload } from './payloads';

type AfterPayPayload = {
  saleId: number;
  printerName?: string;
};

type AfterPayResponse = {
  queued: boolean;
  printed: boolean;
};

export const posClient = {
  afterPay: (payload: AfterPayPayload): Promise<ApiResult<AfterPayResponse>> =>
    invoke<AfterPayResponse>('pos:afterPay', buildDataPayload('pos:afterPay', payload)),
};
