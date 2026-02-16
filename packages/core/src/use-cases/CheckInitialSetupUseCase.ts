import { IUserRepository } from '../interfaces/IUserRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';

export interface SetupStatus {
  isInitialized: boolean;
  hasUsers: boolean;
  hasCompanyInfo: boolean;
}

export class CheckInitialSetupUseCase {
  constructor(
    private userRepo: IUserRepository,
    private settingsRepo: ISettingsRepository
  ) {}

  execute(): SetupStatus {
    // Primary flag — set atomically at the end of InitializeAppUseCase
    const initialized = this.settingsRepo.get('app_initialized');
    const isInitialized = initialized === 'true';

    // Fallback checks for partial-setup detection
    const userCount = this.userRepo.count();
    const companySettings = {
      name: this.settingsRepo.get('company_name'),
      city: this.settingsRepo.get('company_city'),
      area: this.settingsRepo.get('company_area'),
      street: this.settingsRepo.get('company_street'),
    } as const;

    const hasUsers = userCount > 0;
    const hasCompanyInfo =
      !!companySettings.name ||
      !!companySettings.city ||
      !!companySettings.area ||
      !!companySettings.street;

    return {
      isInitialized,
      hasUsers,
      hasCompanyInfo,
    };
  }
}
