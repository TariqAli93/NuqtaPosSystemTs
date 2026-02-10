export type ApiErrorCode = string;

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export const createSuccess = <T>(data: T): ApiResult<T> => ({ ok: true, data });

export const createFailure = (error: ApiError): ApiResult<never> => ({ ok: false, error });

export const normalizeApiError = (error: unknown): ApiError => {
  if (!error) {
    return { code: 'UNKNOWN', message: 'Unknown error' };
  }

  if (typeof error === 'string') {
    return { code: 'UNKNOWN', message: error };
  }

  if (typeof error === 'object') {
    const err = error as { code?: string; message?: string; error?: string; details?: unknown };
    if (err.message || err.error) {
      return {
        code: err.code || 'UNKNOWN',
        message: err.message || err.error || 'Unknown error',
        details: err.details,
      };
    }
  }

  return { code: 'UNKNOWN', message: 'Unknown error' };
};

const unwrapPayload = (response: any) => {
  if (response?.ok === true && 'data' in response) return response.data;
  if (response?.success === true && 'data' in response) return response.data;
  if (response?.data !== undefined) return response.data;
  if (response?.items !== undefined) return response;
  if (response?.result !== undefined) return response.result;
  if (response?.payload !== undefined) return response.payload;
  return response;
};

export const normalizeApiResult = <T>(response: any, mapData?: (data: any) => T): ApiResult<T> => {
  if (response === null || response === undefined) {
    return createFailure({ code: 'EMPTY_RESPONSE', message: 'Empty response' });
  }

  if (response?.ok === false || response?.success === false || response?.error) {
    return createFailure(normalizeApiError(response));
  }

  const payload = unwrapPayload(response);
  const data = mapData ? mapData(payload) : payload;
  return createSuccess(data as T);
};

export const toPagedResult = <T>(input: any): PagedResult<T> => {
  const items =
    (Array.isArray(input?.items) && input.items) ||
    (Array.isArray(input?.data?.items) && input.data.items) ||
    (Array.isArray(input) && input) ||
    [];
  const total =
    (typeof input?.total === 'number' && input.total) ||
    (typeof input?.data?.total === 'number' && input.data.total) ||
    items.length;

  return { items, total } as PagedResult<T>;
};
