import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload, buildIdPayload, buildParamsPayload, buildUpdatePayload } from './payloads';
import type { Category, CategoryInput } from '../types/domain';

export const categoriesClient = {
  getAll: (params?: Record<string, unknown>): Promise<ApiResult<Category[]>> =>
    invoke<Category[]>('categories:getAll', buildParamsPayload('categories:getAll', params)),
  create: (payload: CategoryInput): Promise<ApiResult<Category>> =>
    invoke<Category>('categories:create', buildDataPayload('categories:create', payload)),
  update: (id: number, payload: Partial<CategoryInput>): Promise<ApiResult<Category>> =>
    invoke<Category>('categories:update', buildUpdatePayload('categories:update', id, payload)),
  delete: (id: number): Promise<ApiResult<{ ok: true }>> =>
    invoke<{ ok: true }>('categories:delete', buildIdPayload('categories:delete', id)),
};
