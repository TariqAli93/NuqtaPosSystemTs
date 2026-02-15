import { handleError } from './errorInterceptor';
import {
  createFailure,
  normalizeApiError,
  normalizeApiResult,
  toPagedResult,
  type ApiResult,
  type PagedResult,
} from './contracts';
import { sanitizeForIpc } from './payloads';

declare global {
  interface Window {
    electron: {
      invoke(channel: string, ...args: any[]): Promise<any>;
    };
  }
}

async function invokeRaw(channel: string, args: any[]): Promise<any> {
  const sanitizedArgs = args.map((arg) => sanitizeForIpc(arg));
  return window.electron.invoke(channel, ...sanitizedArgs);
}

/**
 * Invoke an IPC channel and unwrap the ApiResult envelope.
 * Throws an ApiError if the result is { ok: false }.
 */
export async function invokeOrThrow<T>(channel: string, ...args: any[]): Promise<T> {
  const response = await invokeRaw(channel, args);

  // Standard ApiResult envelope
  if (response?.ok === true && 'data' in response) return response.data as T;
  if (response?.ok === false && response?.error) {
    throw normalizeApiError(response.error);
  }

  // Fallback for non-envelope responses
  return response as T;
}

/**
 * Invoke an IPC channel and return a normalised ApiResult<T>.
 */
export async function invoke<T>(channel: string, ...args: any[]): Promise<ApiResult<T>> {
  try {
    const response = await invokeRaw(channel, args);
    return normalizeApiResult<T>(response);
  } catch (error) {
    const normalizedError = normalizeApiError(error);
    handleError(normalizedError);
    return createFailure(normalizedError);
  }
}

/**
 * Invoke an IPC channel that returns paged data and normalise into ApiResult<PagedResult<T>>.
 */
export async function invokePaged<T>(
  channel: string,
  ...args: any[]
): Promise<ApiResult<PagedResult<T>>> {
  try {
    const response = await invokeRaw(channel, args);
    return normalizeApiResult<PagedResult<T>>(response, toPagedResult);
  } catch (error) {
    const normalizedError = normalizeApiError(error);
    handleError(normalizedError);
    return createFailure(normalizedError);
  }
}
