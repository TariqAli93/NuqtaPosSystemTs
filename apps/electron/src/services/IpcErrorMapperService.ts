/**
 * IPC Error Mapper Service
 * Converts domain errors to IPC response format with backward compatibility.
 * Ensures all responses have { error: string } plus optional extended fields.
 */

import { isDomainError, DomainError } from '@nuqtaplus/core';

export interface IpcErrorResponse {
  error: string; // Always present for backward compatibility
  code?: string;
  statusCode?: number;
  details?: any;
}

/**
 * Map any error (domain or unknown) to IPC response format.
 * Handles:
 * - DomainError: structured error with code, statusCode, details
 * - Plain Error: generic error message
 * - Unknown: catches unexpected errors safely
 */
export function mapErrorToIpcResponse(error: any): IpcErrorResponse {
  // Handle DomainError with all metadata
  if (isDomainError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // Handle plain Error objects
  if (error instanceof Error) {
    return {
      error: error.message || 'An unexpected error occurred',
    };
  }

  // Handle string errors (edge case)
  if (typeof error === 'string') {
    return {
      error,
    };
  }

  // Fallback for unknown error types
  return {
    error: 'An unexpected error occurred',
  };
}

/**
 * Type for successfully resolved IPC call
 */
export type IpcSuccessResponse<T> = T & Record<string, any>;

/**
 * Helper to create typed IPC handler wrapper that catches all errors
 */
export function createIpcHandler<T>(
  handler: () => Promise<T>
): () => Promise<T | IpcErrorResponse> {
  return async () => {
    try {
      return await handler();
    } catch (e: any) {
      return mapErrorToIpcResponse(e);
    }
  };
}
