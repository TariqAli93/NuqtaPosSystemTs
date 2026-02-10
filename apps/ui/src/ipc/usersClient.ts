import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload, buildParamsPayload, buildUpdatePayload } from './payloads';
import type { UserInput, UserPublic } from '../types/domain';

export const usersClient = {
  getAll: (params?: Record<string, unknown>): Promise<ApiResult<UserPublic[]>> =>
    invoke<UserPublic[]>('users:getAll', buildParamsPayload('users:getAll', params)),
  create: (payload: UserInput & { password: string }): Promise<ApiResult<UserPublic>> =>
    invoke<UserPublic>('users:create', buildDataPayload('users:create', payload)),
  update: (id: number, payload: Partial<UserInput>): Promise<ApiResult<UserPublic>> =>
    invoke<UserPublic>('users:update', buildUpdatePayload('users:update', id, payload)),
};
