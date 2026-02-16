import { IUserRepository } from '../interfaces/IUserRepository.js';
import { ISettingsRepository } from '../interfaces/ISettingsRepository.js';
import { User } from '../entities/User.js';
import { CompanySettings } from '../entities/Settings.js';
import { ConflictError, ValidationError } from '../errors/DomainErrors.js';
import { hashPassword } from '../utils/helpers.js';

export interface InitializeAppInput {
  admin: {
    username: string;
    password: string;
    fullName: string;
    phone?: string;
  };
  companySettings: CompanySettings;
}

export interface InitializeAppOutput {
  success: boolean;
  admin: Omit<User, 'password'>;
}

/**
 * InitializeAppUseCase
 *
 * Atomic first-run initialization that:
 * 1. Verifies app is NOT already initialized
 * 2. Saves company information
 * 3. Creates the first admin user
 * 4. Persists initialization flag (LAST — crash-safe)
 */
export class InitializeAppUseCase {
  constructor(
    private userRepo: IUserRepository,
    private settingsRepo: ISettingsRepository
  ) {}

  async execute(input: InitializeAppInput): Promise<InitializeAppOutput> {
    // 1. Validate input
    this.validateInput(input);

    // 2. Check if already initialized
    const isInitialized = this.settingsRepo.get('app_initialized');
    if (isInitialized && isInitialized === 'true') {
      throw new ConflictError('Application is already initialized', {
        setting: 'app_initialized',
      });
    }

    // 3. Double-check: ensure no users exist
    const userCount = this.userRepo.count();
    if (userCount > 0) {
      throw new ConflictError('Users already exist. Initialization cannot proceed.', {
        userCount,
      });
    }

    // 4. Save company settings
    this.settingsRepo.setCompanySettings(input.companySettings);

    // 5. Hash password
    const hashedPassword = await hashPassword(input.admin.password);

    // 6. Create admin user
    const admin = this.userRepo.create({
      username: input.admin.username,
      password: hashedPassword,
      fullName: input.admin.fullName,
      phone: input.admin.phone,
      role: 'admin',
      isActive: true,
    } as User);

    // 7. Set initialized flag (CRITICAL: must be LAST for crash safety)
    this.settingsRepo.set('app_initialized', 'true');
    this.settingsRepo.set('initialized_at', new Date().toISOString());

    // 8. Return success (without password)
    const { password, ...adminWithoutPassword } = admin;
    return {
      success: true,
      admin: adminWithoutPassword,
    };
  }

  private validateInput(input: InitializeAppInput): void {
    const { admin, companySettings } = input;

    if (!admin.username || admin.username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters', {
        field: 'username',
      });
    }

    if (!admin.password || admin.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters', {
        field: 'password',
      });
    }

    if (!admin.fullName || admin.fullName.trim().length < 3) {
      throw new ValidationError('Full name must be at least 3 characters', {
        field: 'fullName',
      });
    }

    // Validate username format (alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(admin.username)) {
      throw new ValidationError('Username can only contain letters, numbers, and underscores', {
        field: 'username',
      });
    }

    // Validate company name
    if (!companySettings.name || companySettings.name.trim().length === 0) {
      throw new ValidationError('Company name is required', {
        field: 'companySettings.name',
      });
    }
  }
}
