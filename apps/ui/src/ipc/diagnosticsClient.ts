import { invoke } from './invoke';
import { buildDataPayload } from './payloads';
import type { ApiResult } from './contracts';
import type { FinanceInventoryDiagnostics } from '../types/workspace';

export interface CreateTestSaleResult {
  ok: boolean;
  message: string;
  createdSaleId?: number;
}

export interface CreateTestPurchaseResult {
  ok: boolean;
  message: string;
  createdPurchaseId?: number;
}

export const diagnosticsClient = {
  getFinanceInventoryStatus: (): Promise<ApiResult<FinanceInventoryDiagnostics>> =>
    invoke<FinanceInventoryDiagnostics>('diagnostics:getFinanceInventoryStatus', {}),
  createTestTransaction: (): Promise<ApiResult<CreateTestSaleResult>> =>
    invoke<CreateTestSaleResult>(
      'diagnostics:createTestTransaction',
      buildDataPayload('diagnostics:createTestTransaction', {})
    ),
  createTestSaleCash: (): Promise<ApiResult<CreateTestSaleResult>> =>
    invoke<CreateTestSaleResult>(
      'diagnostics:createTestSaleCash',
      buildDataPayload('diagnostics:createTestSaleCash', {})
    ),
  createTestSaleCredit: (): Promise<ApiResult<CreateTestSaleResult>> =>
    invoke<CreateTestSaleResult>(
      'diagnostics:createTestSaleCredit',
      buildDataPayload('diagnostics:createTestSaleCredit', {})
    ),
  createTestPurchase: (): Promise<ApiResult<CreateTestPurchaseResult>> =>
    invoke<CreateTestPurchaseResult>(
      'diagnostics:createTestPurchase',
      buildDataPayload('diagnostics:createTestPurchase', {})
    ),
};
