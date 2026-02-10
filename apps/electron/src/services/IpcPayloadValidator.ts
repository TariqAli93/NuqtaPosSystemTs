import { ValidationError } from '@nuqtaplus/core';

type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

type PayloadShape = Record<string, unknown>;

function toSafeJson(value: unknown): JsonValue {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, val) => (val === undefined ? null : val))
    ) as JsonValue;
  } catch {
    return null;
  }
}

export function assertPayload(
  channel: string,
  payload: unknown,
  requiredKeys: string[]
): PayloadShape {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError(`Invalid payload for ${channel}: expected object`, {
      channel,
      requiredKeys,
      receivedPayload: toSafeJson(payload),
      missingKeys: requiredKeys,
    });
  }

  const missingKeys = requiredKeys.filter(
    (key) => (payload as PayloadShape)[key] === undefined || (payload as PayloadShape)[key] === null
  );

  if (missingKeys.length > 0) {
    throw new ValidationError(`Invalid payload for ${channel}: missing ${missingKeys.join(', ')}`, {
      channel,
      requiredKeys,
      missingKeys,
      receivedPayload: toSafeJson(payload),
    });
  }

  return payload as PayloadShape;
}

export function buildValidationError(
  channel: string,
  payload: unknown,
  message: string,
  extraDetails?: Record<string, unknown>
): ValidationError {
  return new ValidationError(message, {
    channel,
    receivedPayload: toSafeJson(payload),
    ...(extraDetails || {}),
  });
}
