import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload } from './payloads';

export interface AccountingCodeSelections {
  cashAccountCode: string;
  inventoryAccountCode: string;
  arAccountCode: string;
  apAccountCode: string;
  salesRevenueAccountCode: string;
  cogsAccountCode: string;
}

export interface AccountingSetupStatus {
  enabled: boolean | null;
  seeded: boolean;
  missingCodes: string[];
  selectedCodes: AccountingCodeSelections;
  baseCurrency: string | null;
  warnings: string[];
}

interface SeedChartOfAccountsRequest {
  baseCurrency?: string;
  cashAccountCode?: string;
  inventoryAccountCode?: string;
  arAccountCode?: string;
  apAccountCode?: string;
  salesRevenueAccountCode?: string;
  cogsAccountCode?: string;
}

type IpcPayload = Record<string, unknown>;

interface SeedChartOfAccountsResponse extends AccountingSetupStatus {
  message: string;
  createdCodes: string[];
  existingCodes: string[];
}

export const setupClient = {
  getAccountingSetupStatus: (): Promise<ApiResult<AccountingSetupStatus>> =>
    invoke<AccountingSetupStatus>('setup:getAccountingSetupStatus'),

  setAccountingEnabled: (enabled: boolean): Promise<ApiResult<AccountingSetupStatus>> =>
    invoke<AccountingSetupStatus>(
      'setup:setAccountingEnabled',
      buildDataPayload('setup:setAccountingEnabled', { enabled })
    ),

  seedChartOfAccounts: (
    payload: SeedChartOfAccountsRequest = {}
  ): Promise<ApiResult<SeedChartOfAccountsResponse>> =>
    invoke<SeedChartOfAccountsResponse>(
      'setup:seedChartOfAccounts',
      buildDataPayload('setup:seedChartOfAccounts', payload as IpcPayload)
    ),
};
