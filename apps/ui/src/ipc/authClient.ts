import type { ApiResult } from './contracts';
import type { FirstUserInput, UserPublic, CompanySettings } from '../types/domain';
import { invoke } from './invoke';
import { buildDataPayload } from './payloads';

interface AuthLoginRequest {
  username: string;
  password: string;
  [key: string]: any;
}

interface AuthLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserPublic;
  permissions: string[];
}

export interface AuthSetupStatus {
  isInitialized: boolean;
  hasUsers: boolean;
  hasCompanyInfo: boolean;
  wizardCompleted: boolean;
}

export interface InitializeAppRequest {
  admin: {
    username: string;
    password: string;
    fullName: string;
    phone?: string;
  };
  companySettings: CompanySettings;
}

interface AuthVerifyCredentialsRequest {
  username: string;
  password: string;
  [key: string]: any;
}

interface AuthVerifyCredentialsResponse {
  user: UserPublic;
  permissions?: string[];
}

interface AuthChangePasswordRequest {
  username: string;
  currentPassword: string;
  newPassword: string;
  [key: string]: any;
}

interface AuthChangePasswordResponse {
  success: true;
}

interface AuthValidateTokenResponse {
  valid: boolean;
  error?: string;
}

export const authClient = {
  login: (credentials: AuthLoginRequest): Promise<ApiResult<AuthLoginResponse>> =>
    invoke<AuthLoginResponse>('auth:login', buildDataPayload('auth:login', credentials)),
  checkInitialSetup: (): Promise<ApiResult<AuthSetupStatus>> =>
    invoke<AuthSetupStatus>('auth:checkInitialSetup'),
  createFirstUser: (userData: FirstUserInput): Promise<ApiResult<AuthLoginResponse>> =>
    invoke<AuthLoginResponse>(
      'auth:createFirstUser',
      buildDataPayload('auth:createFirstUser', userData)
    ),
  initializeApp: (
    data: InitializeAppRequest
  ): Promise<ApiResult<{ success: boolean; admin: UserPublic }>> =>
    invoke<{ success: boolean; admin: UserPublic }>(
      'setup:initialize',
      buildDataPayload('setup:initialize', data as any)
    ),
  refresh: (): Promise<ApiResult<{ accessToken: string }>> =>
    invoke<{ accessToken: string }>('auth:refresh'),
  logout: (): Promise<ApiResult<{ ok: true }>> => invoke<{ ok: true }>('auth:logout'),
  getCurrentUser: (): Promise<ApiResult<{ user: UserPublic; permissions: string[] }>> =>
    invoke<{ user: UserPublic; permissions: string[] }>('auth:getCurrentUser'),
  verifyCredentials: (
    credentials: AuthVerifyCredentialsRequest
  ): Promise<ApiResult<AuthVerifyCredentialsResponse>> =>
    invoke<AuthVerifyCredentialsResponse>(
      'auth:verifyCredentials',
      buildDataPayload('auth:verifyCredentials', credentials)
    ),
  changePassword: (
    payload: AuthChangePasswordRequest
  ): Promise<ApiResult<AuthChangePasswordResponse>> =>
    invoke<AuthChangePasswordResponse>(
      'auth:changePassword',
      buildDataPayload('auth:changePassword', payload)
    ),
  validateToken: (payload: { token: string }): Promise<ApiResult<AuthValidateTokenResponse>> =>
    invoke<AuthValidateTokenResponse>(
      'auth:validateToken',
      buildDataPayload('auth:validateToken', payload)
    ),
};
