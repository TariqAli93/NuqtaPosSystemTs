import { ipcMain } from 'electron';
import { LoginUseCase } from '@nuqtaplus/core';
import { CheckInitialSetupUseCase } from '@nuqtaplus/core';
import { RegisterFirstUserUseCase } from '@nuqtaplus/core';
import { InitializeAppUseCase } from '@nuqtaplus/core';
import { InitializeAccountingUseCase } from '@nuqtaplus/core';
import { UpdateUserUseCase } from '@nuqtaplus/core';
import { SqliteUserRepository } from '@nuqtaplus/data';
import { SqliteSettingsRepository } from '@nuqtaplus/data';
import { SqliteAccountingRepository } from '@nuqtaplus/data';
import { DatabaseType } from '@nuqtaplus/data';
import { userContextService } from '../services/UserContextService.js';
import { tokenManager } from '../services/TokenManager.js';
import { mapErrorToResult } from '../services/IpcErrorMapperService.js';
import { ok } from '../services/IpcErrorMapperService.js';
import log from 'electron-log';
import { assertPayload, buildValidationError } from '../services/IpcPayloadValidator.js';

export function registerAuthHandlers(db: DatabaseType) {
  const userRepo = new SqliteUserRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const accountingRepo = new SqliteAccountingRepository(db.db);

  const loginUseCase = new LoginUseCase(userRepo);
  const checkInitialSetupUseCase = new CheckInitialSetupUseCase(userRepo, settingsRepo);
  const registerFirstUserUseCase = new RegisterFirstUserUseCase(userRepo);
  const initializeAppUseCase = new InitializeAppUseCase(userRepo, settingsRepo);
  const initializeAccountingUseCase = new InitializeAccountingUseCase(settingsRepo, accountingRepo);
  const updateUserUseCase = new UpdateUserUseCase(userRepo);

  ipcMain.handle('auth:login', async (_event, payload) => {
    try {
      const { data } = assertPayload('auth:login', payload, ['data']);
      const credentials = data as { username: string; password: string };
      const result = await loginUseCase.execute(credentials);
      // Store user context with access token for use in other IPC handlers
      if (result.user && result.user.id) {
        // Issue tokens
        const { accessToken } = tokenManager.issueTokens(
          result.user.id,
          result.user.role,
          result.permissions || []
        );

        // Store context with access token
        userContextService.setContext(
          result.user.id,
          result.user.username,
          result.user.role,
          result.permissions || [],
          accessToken
        );

        // Return access token and user info (NOT refresh token)
        // Refresh token is kept secure in tokenManager storage
        const response = {
          accessToken,
          user: result.user,
          permissions: result.permissions,
        };
        return ok(JSON.parse(JSON.stringify(response)));
      }
      throw new Error('Login failed: invalid user');
    } catch (e: unknown) {
      log.error('Login error:', e);
      const errorResponse = mapErrorToResult(e);
      return errorResponse;
    }
  });

  ipcMain.handle('auth:verifyCredentials', async (_event, payload) => {
    try {
      const { data } = assertPayload('auth:verifyCredentials', payload, ['data']);
      const credentials = data as { username?: string; password?: string };
      if (!credentials?.username || !credentials?.password) {
        throw buildValidationError(
          'auth:verifyCredentials',
          payload,
          'Username and password are required'
        );
      }
      const result = await loginUseCase.execute({
        username: credentials.username,
        password: credentials.password,
      });
      return ok({
        user: result.user,
        permissions: result.permissions,
      });
    } catch (e: unknown) {
      log.error('Credential verification error:', e);
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('auth:checkInitialSetup', async () => {
    try {
      // No auth required for initial setup check
      const status = checkInitialSetupUseCase.execute();
      return ok(status);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('auth:createFirstUser', async (_event, payload) => {
    try {
      // PHASE 9 SECURITY: First-run gate - only allow during initial setup
      const setupStatus = checkInitialSetupUseCase.execute();
      if (setupStatus.isInitialized || setupStatus.hasUsers) {
        throw new Error('Cannot create first user: application already initialized');
      }

      // Validate payload
      const { data } = assertPayload('auth:createFirstUser', payload, ['data']);
      const userData = data as Record<string, unknown>;
      if (!userData || typeof userData !== 'object') {
        throw buildValidationError('auth:createFirstUser', payload, 'User data is required');
      }

      if (!userData.username || typeof userData.username !== 'string') {
        throw buildValidationError('auth:createFirstUser', payload, 'Username must be a string');
      }

      if (
        !userData.password ||
        typeof userData.password !== 'string' ||
        userData.password.length < 8
      ) {
        throw buildValidationError(
          'auth:createFirstUser',
          payload,
          'Password must be a string with min length 8'
        );
      }

      const result = await registerFirstUserUseCase.execute(userData as any);

      // Issue tokens for first user (same as login)
      if (result && result.id) {
        const userPermissions = (result as any).permissions || [];
        const { accessToken } = tokenManager.issueTokens(result.id, result.role, userPermissions);

        // Store context with access token
        userContextService.setContext(
          result.id,
          result.username,
          result.role,
          userPermissions,
          accessToken
        );

        const response = {
          accessToken,
          user: {
            id: result.id,
            username: result.username,
            role: result.role,
          },
          permissions: userPermissions,
        };
        return ok(JSON.parse(JSON.stringify(response)));
      }

      throw new Error('First user creation failed: invalid user');
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('setup:initialize', async (_event, payload) => {
    try {
      // PHASE 9 SECURITY: First-run gate - only allow during initial setup
      const setupStatus = checkInitialSetupUseCase.execute();
      if (setupStatus.isInitialized || setupStatus.hasUsers) {
        throw new Error('Cannot initialize: application already initialized');
      }

      // Validate payload
      const { data } = assertPayload('setup:initialize', payload, ['data']);
      const input = data as Record<string, unknown>;

      if (!input || typeof input !== 'object') {
        throw buildValidationError('setup:initialize', payload, 'Input is required');
      }

      if (!input.admin || typeof input.admin !== 'object') {
        throw buildValidationError('setup:initialize', payload, 'Admin user is required');
      }

      if (!input.companySettings || typeof input.companySettings !== 'object') {
        throw buildValidationError('setup:initialize', payload, 'Company settings are required');
      }

      // InitializeAppUseCase uses Drizzle's built-in async transaction pattern
      // for atomic operations across repositories
      log.info('Initializing app with payload:', input);
      const result = await initializeAppUseCase.execute(input as any);
      return ok(result);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('setup:setAccountingEnabled', async (_event, payload) => {
    try {
      const setupStatus = checkInitialSetupUseCase.execute();
      if (setupStatus.isInitialized || setupStatus.hasUsers) {
        throw new Error('Cannot update setup settings: application already initialized');
      }

      const { data } = assertPayload('setup:setAccountingEnabled', payload, ['data']);
      const body = data as { enabled?: unknown };
      if (typeof body.enabled !== 'boolean') {
        throw buildValidationError(
          'setup:setAccountingEnabled',
          payload,
          'enabled must be a boolean'
        );
      }

      settingsRepo.set('accounting.enabled', body.enabled ? 'true' : 'false');
      if (!body.enabled) {
        settingsRepo.set('accounting.coaSeeded', 'false');
      }

      return ok(initializeAccountingUseCase.getStatus());
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('setup:seedChartOfAccounts', async (_event, payload) => {
    try {
      const setupStatus = checkInitialSetupUseCase.execute();
      if (setupStatus.isInitialized || setupStatus.hasUsers) {
        throw new Error('Cannot seed chart of accounts: application already initialized');
      }

      const body = assertPayload('setup:seedChartOfAccounts', payload, ['data']);
      const data = (body.data || {}) as Record<string, unknown>;
      if (typeof data !== 'object' || Array.isArray(data)) {
        throw buildValidationError(
          'setup:seedChartOfAccounts',
          payload,
          'data must be an object'
        );
      }

      const result = initializeAccountingUseCase.execute({
        baseCurrency:
          typeof data.baseCurrency === 'string' ? data.baseCurrency : undefined,
        cashAccountCode:
          typeof data.cashAccountCode === 'string' ? data.cashAccountCode : undefined,
        inventoryAccountCode:
          typeof data.inventoryAccountCode === 'string' ? data.inventoryAccountCode : undefined,
        arAccountCode: typeof data.arAccountCode === 'string' ? data.arAccountCode : undefined,
        apAccountCode: typeof data.apAccountCode === 'string' ? data.apAccountCode : undefined,
        salesRevenueAccountCode:
          typeof data.salesRevenueAccountCode === 'string'
            ? data.salesRevenueAccountCode
            : undefined,
        cogsAccountCode:
          typeof data.cogsAccountCode === 'string' ? data.cogsAccountCode : undefined,
      });

      return ok(result);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('setup:getAccountingSetupStatus', async () => {
    try {
      return ok(initializeAccountingUseCase.getStatus());
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  /**
   * Refresh access token using refresh token
   * Called when access token expires or client detects 401
   */
  ipcMain.handle('auth:refresh', async () => {
    try {
      const tokens = tokenManager.refreshAccessToken();
      if (!tokens) {
        throw new Error('Invalid or expired refresh token');
      }

      // Update user context with new access token
      const context = userContextService.getContext();
      if (context) {
        userContextService.updateAccessToken(tokens.accessToken);
      }

      // Return new access token (refresh token stays in secure storage)
      return ok({
        accessToken: tokens.accessToken,
      });
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  /**
   * Logout - clear tokens and user context
   */
  ipcMain.handle('auth:logout', async () => {
    try {
      tokenManager.clearTokens();
      userContextService.clearContext();
      return ok(null);
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  ipcMain.handle('auth:changePassword', async (_event, payload) => {
    try {
      const body = assertPayload('auth:changePassword', payload, ['data']);
      const data = body.data as {
        username?: string;
        currentPassword?: string;
        newPassword?: string;
      };
      if (!data?.username || !data?.currentPassword || !data?.newPassword) {
        throw buildValidationError(
          'auth:changePassword',
          payload,
          'Username, currentPassword, and newPassword are required'
        );
      }

      const result = await loginUseCase.execute({
        username: data.username,
        password: data.currentPassword,
      });

      if (!result?.user?.id) {
        throw new Error('User not found');
      }

      await updateUserUseCase.execute(result.user.id, { password: data.newPassword });

      return ok(null);
    } catch (e: unknown) {
      log.error('Change password error:', e);
      return mapErrorToResult(e);
    }
  });

  /**
   * Get current user info (if authenticated)
   */
  ipcMain.handle('auth:getCurrentUser', async () => {
    try {
      const context = userContextService.getContext();
      if (!context) {
        throw new Error('Not authenticated');
      }
      return ok({
        user: {
          id: context.userId,
          username: context.username,
          role: context.role,
        },
        permissions: context.permissions,
      });
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });

  /*
   * validate access token and return status (used by renderer to check if user is still authenticated)
   */
  ipcMain.handle('auth:validateToken', async (_event, payload) => {
    try {
      const { token } = assertPayload('auth:validateToken', payload, ['token']);
      const context = userContextService.getContext();
      if (!context || !context.accessToken) {
        throw new Error('No access token found');
      }
      if (token !== context.accessToken) {
        throw new Error('Invalid access token');
      }

      const isValid = tokenManager.validateAccessToken(token);
      if (!isValid) {
        throw new Error('Access token is invalid or expired');
      }

      return ok({ valid: true });
    } catch (e: unknown) {
      return mapErrorToResult(e);
    }
  });
}
