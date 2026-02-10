import { IUserRepository } from '../interfaces/IUserRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';

export class CheckInitialSetupUseCase {
  constructor(
    private userRepo: IUserRepository,
    private settingsRepo: ISettingsRepository
  ) {}

  async execute(): Promise<{ hasUsers: boolean; hasCompanyInfo: boolean }> {
    // Fallback checks for legacy detection
    const userCount = await this.userRepo.count();
    const companySettings = {
      name: await this.settingsRepo.get('company_name'),
      city: await this.settingsRepo.get('company_city'),
      area: await this.settingsRepo.get('company_area'),
      street: await this.settingsRepo.get('company_street'),
    } as const;

    const hasUsers = userCount > 0;
    const hasCompanyInfo =
      !!companySettings.name ||
      !!companySettings.city ||
      !!companySettings.area ||
      !!companySettings.street;

    return {
      hasUsers,
      hasCompanyInfo,
    };
  }
}
