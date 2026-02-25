import type { Account } from '../../entities/Accounting.js';
import { IAccountingRepository } from '../../interfaces/IAccountingRepository.js';
import { ISettingsRepository } from '../../interfaces/ISettingsRepository.js';

export const ACCOUNTING_SETTING_KEYS = {
  enabled: 'accounting.enabled',
  coaSeeded: 'accounting.coaSeeded',
  baseCurrency: 'currency.base',
  cashAccountCode: 'accounting.cashAccountCode',
  inventoryAccountCode: 'accounting.inventoryAccountCode',
  arAccountCode: 'accounting.arAccountCode',
  apAccountCode: 'accounting.apAccountCode',
  salesRevenueAccountCode: 'accounting.salesRevenueAccountCode',
  cogsAccountCode: 'accounting.cogsAccountCode',
  vatInputAccountCode: 'accounting.vatInputAccountCode',
  vatOutputAccountCode: 'accounting.vatOutputAccountCode',
} as const;

export const DEFAULT_ACCOUNTING_CODES = {
  cashAccountCode: '1001',
  arAccountCode: '1100',
  inventoryAccountCode: '1200',
  vatInputAccountCode: '1300',
  apAccountCode: '2100',
  vatOutputAccountCode: '2200',
  salesRevenueAccountCode: '4001',
  cogsAccountCode: '5001',
} as const;

export interface AccountingCodeSelections {
  cashAccountCode: string;
  inventoryAccountCode: string;
  arAccountCode: string;
  apAccountCode: string;
  salesRevenueAccountCode: string;
  cogsAccountCode: string;
  vatInputAccountCode: string;
  vatOutputAccountCode: string;
}

export interface AccountingSetupStatus {
  enabled: boolean | null;
  seeded: boolean;
  missingCodes: string[];
  selectedCodes: AccountingCodeSelections;
  baseCurrency: string | null;
  warnings: string[];
}

export interface InitializeAccountingInput {
  baseCurrency?: string;
  cashAccountCode?: string;
  inventoryAccountCode?: string;
  arAccountCode?: string;
  apAccountCode?: string;
  salesRevenueAccountCode?: string;
  cogsAccountCode?: string;
  vatInputAccountCode?: string;
  vatOutputAccountCode?: string;
}

export interface InitializeAccountingResult extends AccountingSetupStatus {
  message: string;
  createdCodes: string[];
  existingCodes: string[];
}

type AccountBlueprint = {
  selectionKey: keyof AccountingCodeSelections;
  name: string;
  nameAr: string;
  accountType: Account['accountType'];
};

const ACCOUNT_BLUEPRINTS: AccountBlueprint[] = [
  {
    selectionKey: 'cashAccountCode',
    name: 'الصندوق',
    nameAr: 'الصندوق',
    accountType: 'asset',
  },
  {
    selectionKey: 'arAccountCode',
    name: 'ذمم العملاء',
    nameAr: 'ذمم العملاء',
    accountType: 'asset',
  },
  {
    selectionKey: 'inventoryAccountCode',
    name: 'المخزون',
    nameAr: 'المخزون',
    accountType: 'asset',
  },
  {
    selectionKey: 'apAccountCode',
    name: 'ذمم الموردين',
    nameAr: 'ذمم الموردين',
    accountType: 'liability',
  },
  {
    selectionKey: 'salesRevenueAccountCode',
    name: 'إيرادات المبيعات',
    nameAr: 'إيرادات المبيعات',
    accountType: 'revenue',
  },
  {
    selectionKey: 'cogsAccountCode',
    name: 'تكلفة البضاعة',
    nameAr: 'تكلفة البضاعة',
    accountType: 'expense',
  },
  {
    selectionKey: 'vatInputAccountCode',
    name: 'ضريبة المدخلات',
    nameAr: 'ضريبة المدخلات',
    accountType: 'asset',
  },
  {
    selectionKey: 'vatOutputAccountCode',
    name: 'ضريبة المخرجات',
    nameAr: 'ضريبة المخرجات',
    accountType: 'liability',
  },
];

export class InitializeAccountingUseCase {
  constructor(
    private settingsRepo: ISettingsRepository,
    private accountingRepo: IAccountingRepository
  ) {}

  getStatus(): AccountingSetupStatus {
    const enabled = this.readEnabled();
    const selectedCodes = this.resolveSelectedCodes();
    const seededFlag = this.settingsRepo.get(ACCOUNTING_SETTING_KEYS.coaSeeded) === 'true';
    const missingCodes = enabled === true ? this.findMissingCodes(selectedCodes) : [];
    const seeded = enabled === true ? seededFlag && missingCodes.length === 0 : false;
    const warnings =
      enabled === true && missingCodes.length > 0
        ? [`Missing account codes: ${missingCodes.join(', ')}`]
        : [];

    return {
      enabled,
      seeded,
      missingCodes,
      selectedCodes,
      baseCurrency: this.settingsRepo.get(ACCOUNTING_SETTING_KEYS.baseCurrency),
      warnings,
    };
  }

  execute(input: InitializeAccountingInput = {}): InitializeAccountingResult {
    this.persistConfiguration(input);

    const enabled = this.readEnabled();
    const selectedCodes = this.resolveSelectedCodes(input);

    if (enabled !== true) {
      this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.coaSeeded, 'false');
      return {
        enabled,
        seeded: false,
        missingCodes: [],
        selectedCodes,
        baseCurrency: this.settingsRepo.get(ACCOUNTING_SETTING_KEYS.baseCurrency),
        warnings: [],
        message: 'Accounting disabled; nothing to seed.',
        createdCodes: [],
        existingCodes: [],
      };
    }

    const createdCodes: string[] = [];
    const existingCodes: string[] = [];
    const warnings: string[] = [];

    for (const blueprint of ACCOUNT_BLUEPRINTS) {
      const code = selectedCodes[blueprint.selectionKey];
      if (!code) {
        warnings.push(`Missing code for ${blueprint.selectionKey}.`);
        continue;
      }

      const existing = this.accountingRepo.findAccountByCode(code);
      if (existing) {
        existingCodes.push(code);
        continue;
      }

      try {
        this.accountingRepo.createAccountSync({
          code,
          name: blueprint.name,
          nameAr: blueprint.nameAr,
          accountType: blueprint.accountType,
          parentId: null,
          isSystem: true,
          isActive: true,
          balance: 0,
        });
        createdCodes.push(code);
      } catch (error: unknown) {
        warnings.push(
          `Failed seeding account ${code}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const missingCodes = this.findMissingCodes(selectedCodes);
    if (missingCodes.length > 0) {
      warnings.push(`Missing account codes: ${missingCodes.join(', ')}`);
    }

    const seeded = missingCodes.length === 0;
    this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.coaSeeded, seeded ? 'true' : 'false');

    return {
      enabled,
      seeded,
      missingCodes,
      selectedCodes,
      baseCurrency: this.settingsRepo.get(ACCOUNTING_SETTING_KEYS.baseCurrency),
      warnings,
      message: seeded ? 'Default chart of accounts is ready.' : 'Chart of accounts is incomplete.',
      createdCodes,
      existingCodes,
    };
  }

  private persistConfiguration(input: InitializeAccountingInput): void {
    if (input.baseCurrency && input.baseCurrency.trim().length > 0) {
      this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.baseCurrency, input.baseCurrency.trim());
    }

    const selected = this.resolveSelectedCodes(input);
    this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.cashAccountCode, selected.cashAccountCode);
    this.settingsRepo.set(
      ACCOUNTING_SETTING_KEYS.inventoryAccountCode,
      selected.inventoryAccountCode
    );
    this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.arAccountCode, selected.arAccountCode);
    this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.apAccountCode, selected.apAccountCode);
    this.settingsRepo.set(
      ACCOUNTING_SETTING_KEYS.salesRevenueAccountCode,
      selected.salesRevenueAccountCode
    );
    this.settingsRepo.set(ACCOUNTING_SETTING_KEYS.cogsAccountCode, selected.cogsAccountCode);
    this.settingsRepo.set(
      ACCOUNTING_SETTING_KEYS.vatInputAccountCode,
      selected.vatInputAccountCode
    );
    this.settingsRepo.set(
      ACCOUNTING_SETTING_KEYS.vatOutputAccountCode,
      selected.vatOutputAccountCode
    );
  }

  private resolveSelectedCodes(input: InitializeAccountingInput = {}): AccountingCodeSelections {
    return {
      cashAccountCode: this.resolveCode(
        input.cashAccountCode,
        ACCOUNTING_SETTING_KEYS.cashAccountCode,
        DEFAULT_ACCOUNTING_CODES.cashAccountCode
      ),
      inventoryAccountCode: this.resolveCode(
        input.inventoryAccountCode,
        ACCOUNTING_SETTING_KEYS.inventoryAccountCode,
        DEFAULT_ACCOUNTING_CODES.inventoryAccountCode
      ),
      arAccountCode: this.resolveCode(
        input.arAccountCode,
        ACCOUNTING_SETTING_KEYS.arAccountCode,
        DEFAULT_ACCOUNTING_CODES.arAccountCode
      ),
      apAccountCode: this.resolveCode(
        input.apAccountCode,
        ACCOUNTING_SETTING_KEYS.apAccountCode,
        DEFAULT_ACCOUNTING_CODES.apAccountCode
      ),
      salesRevenueAccountCode: this.resolveCode(
        input.salesRevenueAccountCode,
        ACCOUNTING_SETTING_KEYS.salesRevenueAccountCode,
        DEFAULT_ACCOUNTING_CODES.salesRevenueAccountCode
      ),
      cogsAccountCode: this.resolveCode(
        input.cogsAccountCode,
        ACCOUNTING_SETTING_KEYS.cogsAccountCode,
        DEFAULT_ACCOUNTING_CODES.cogsAccountCode
      ),
      vatInputAccountCode: this.resolveCode(
        input.vatInputAccountCode,
        ACCOUNTING_SETTING_KEYS.vatInputAccountCode,
        DEFAULT_ACCOUNTING_CODES.vatInputAccountCode
      ),
      vatOutputAccountCode: this.resolveCode(
        input.vatOutputAccountCode,
        ACCOUNTING_SETTING_KEYS.vatOutputAccountCode,
        DEFAULT_ACCOUNTING_CODES.vatOutputAccountCode
      ),
    };
  }

  private resolveCode(inputCode: string | undefined, key: string, fallback: string): string {
    const direct = inputCode?.trim();
    if (direct) return direct;

    const fromSettings = this.settingsRepo.get(key)?.trim();
    if (fromSettings) return fromSettings;

    return fallback;
  }

  private readEnabled(): boolean | null {
    const raw = this.settingsRepo.get(ACCOUNTING_SETTING_KEYS.enabled);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  }

  private findMissingCodes(selectedCodes: AccountingCodeSelections): string[] {
    const uniqueCodes = Array.from(
      new Set(Object.values(selectedCodes).map((code) => code.trim()))
    );
    return uniqueCodes.filter((code) => !this.accountingRepo.findAccountByCode(code)?.id);
  }
}
