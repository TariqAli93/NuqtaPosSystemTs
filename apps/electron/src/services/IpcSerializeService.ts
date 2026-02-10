/**
 * IPC Serialize Service
 * Ensures all values returned through IPC are safe for structured cloning.
 *
 * Electron IPC uses the Structured Clone Algorithm, which rejects:
 * - Class instances with prototypes/methods
 * - Error objects
 * - Functions, Symbols
 * - Database handles, streams, etc.
 *
 * This service converts non-clonable values to plain objects.
 */

/**
 * Safely serialize a value for IPC transmission.
 * If the value cannot be cloned, returns a safe error response.
 *
 * @param value - Any value returned from an IPC handler
 * @param isDev - Include debug info if true
 * @returns Clone-safe plain object or error DTO
 */
export function safeSerialize<T>(value: T, isDev = false): T | SerializeErrorDTO {
  try {
    // Test if the value can be structured cloned
    structuredClone(value);
    return value;
  } catch (e: any) {
    // Fallback: try JSON serialization (handles toJSON())
    try {
      const jsonStr = JSON.stringify(value);
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch {
      // Final fallback: return safe error
      return {
        ok: false,
        error: {
          code: 'SERIALIZE_ERROR',
          message: 'Value could not be serialized for IPC transmission',
          details: isDev
            ? { type: typeof value, constructorName: value?.constructor?.name }
            : undefined,
        },
      } as any;
    }
  }
}

/**
 * Serialize an array of values, converting each safely.
 * Preserves array structure, converts items individually.
 */
export function safeSerializeArray<T>(items: T[], isDev = false): (T | SerializeErrorDTO)[] {
  return items.map((item) => safeSerialize(item, isDev));
}

/**
 * Wraps an IPC handler result and ensures it's clone-safe.
 * Used as final step before returning from ipcMain.handle().
 */
export function wrapIpcResult<T>(handler: () => Promise<T | any>, isDev = false) {
  return async () => {
    try {
      const result = await handler();
      return safeSerialize(result, isDev);
    } catch (e: any) {
      // Let error handler deal with this
      throw e;
    }
  };
}

/**
 * Standard error DTO for IPC
 */
export interface SerializeErrorDTO {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
