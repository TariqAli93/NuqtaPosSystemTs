/**
 * IPC Error Mapper Service
 *
 * Converts any error into the standard ApiResult<never> envelope.
 * This is a thin wrapper around the shared contract's `mapErrorToResult`.
 *
 * IMPORTANT: Every IPC handler's catch block MUST call this function
 * so that the renderer always receives { ok: false, error: ApiError }.
 */

import { mapErrorToResult, ok } from '@nuqtaplus/core';
import type { ApiResult, ApiError } from '@nuqtaplus/core';

// Re-export from contract for backward compat within electron app
export { ok, mapErrorToResult };
export type { ApiResult, ApiError };

/**
 * @deprecated Use `mapErrorToResult` directly from @nuqtaplus/core.
 * Kept as an alias for existing call-sites during migration.
 */
export function mapErrorToIpcResponse(error: unknown): ApiResult<never> {
  return mapErrorToResult(error);
}
