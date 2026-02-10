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

function unwrapResponseOrThrow<T>(response: any): T {
  if (response === null || response === undefined) {
    throw { code: 'EMPTY_RESPONSE', message: 'Empty response' };
  }

  if (response?.ok === false || response?.success === false || response?.error) {
    throw normalizeApiError(response?.error ?? response);
  }

  if (response?.ok === true && 'data' in response) return response.data as T;
  if (response?.success === true && 'data' in response) return response.data as T;
  if (response?.data !== undefined) return response.data as T;

  return response as T;
}

export async function invokeOrThrow<T>(channel: string, ...args: any[]): Promise<T> {
  const response = await invokeRaw(channel, args);
  return unwrapResponseOrThrow<T>(response);
}

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
