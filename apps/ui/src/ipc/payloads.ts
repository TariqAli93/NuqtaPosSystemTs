import { isProxy, toRaw } from 'vue';

type Payload = Record<string, unknown>;

function normalizePayload<T>(payload: T): T {
  if (payload === undefined || payload === null) return payload;
  if (payload instanceof Date) return payload.toISOString() as T;
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizePayload(item)).filter((item) => item !== undefined) as T;
  }
  if (typeof payload !== 'object') return payload;

  const unwrapped = isProxy(payload as object) ? toRaw(payload as object) : (payload as object);
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(unwrapped)) {
    const value = normalizePayload((unwrapped as Record<string, unknown>)[key]);
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

export function sanitizeForIpc<T>(payload: T): T {
  return normalizePayload(payload);
}

function assertObjectPayload(channel: string, payload: unknown): Payload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`[IPC] ${channel} payload must be an object`);
  }
  return payload as Payload;
}

function toNumberId(id: number | string, channel: string): number {
  if (typeof id === 'number') return id;
  if (typeof id === 'string' && id.trim() !== '') {
    const parsed = Number(id);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new Error(`[IPC] ${channel} id must be a number`);
}

export function buildParamsPayload(channel: string, params?: Payload) {
  if (
    params !== undefined &&
    (typeof params !== 'object' || params === null || Array.isArray(params))
  ) {
    throw new Error(`[IPC] ${channel} params must be an object`);
  }
  const payload = { params: params || {} };
  assertObjectPayload(channel, payload);
  return normalizePayload(payload);
}

export function buildDataPayload(channel: string, data: Payload) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`[IPC] ${channel} data must be an object`);
  }
  const payload = { data };
  assertObjectPayload(channel, payload);
  return normalizePayload(payload);
}

export function buildIdPayload(channel: string, id: number | string) {
  const payload = { id: toNumberId(id, channel) };
  assertObjectPayload(channel, payload);
  return normalizePayload(payload);
}

export function buildKeyPayload(channel: string, key: string) {
  if (typeof key !== 'string') {
    throw new Error(`[IPC] ${channel} key must be a string`);
  }
  const payload = { key };
  assertObjectPayload(channel, payload);
  return normalizePayload(payload);
}

export function buildUpdatePayload(channel: string, id: number | string, data: Payload) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`[IPC] ${channel} data must be an object`);
  }
  const payload = { id: toNumberId(id, channel), data };
  assertObjectPayload(channel, payload);
  return normalizePayload(payload);
}
