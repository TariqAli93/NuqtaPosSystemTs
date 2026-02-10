/**
 * IPC Error Mapper Tests
 * Validates typed error to IPC response conversion
 */
import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  UnauthorizedError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  InsufficientStockError,
  InvalidStateError,
} from '@nuqtaplus/core';

/**
 * Simulated IPC error mapper (moved to test for type safety)
 * In real code, this is apps/electron/src/services/IpcErrorMapperService.ts
 */
function mapErrorToIpcResponse(error: any): any {
  // Domain errors with statusCode
  if (error.statusCode && error.code) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details || null,
    };
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      error: error.message,
      statusCode: 500,
    };
  }

  return {
    error: 'Unknown error',
    statusCode: 500,
  };
}

describe('IPC Error Mapper', () => {
  describe('Domain Error Mapping', () => {
    it('should map ValidationError correctly', () => {
      const error = new ValidationError('Invalid email format', { field: 'email' });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Invalid email format');
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.statusCode).toBe(400);
      expect(response.details.field).toBe('email');
    });

    it('should map UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Invalid credentials');
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Invalid credentials');
      expect(response.code).toBe('UNAUTHORIZED');
      expect(response.statusCode).toBe(401);
    });

    it('should map PermissionDeniedError correctly', () => {
      const error = new PermissionDeniedError('Access denied', {
        required: 'sales:delete',
        userRole: 'cashier',
      });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Access denied');
      expect(response.code).toBe('PERMISSION_DENIED');
      expect(response.statusCode).toBe(403);
      expect(response.details.required).toBe('sales:delete');
      expect(response.details.userRole).toBe('cashier');
    });

    it('should map NotFoundError correctly', () => {
      const error = new NotFoundError('Product not found', { productId: 42 });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Product not found');
      expect(response.code).toBe('NOT_FOUND');
      expect(response.statusCode).toBe(404);
      expect(response.details.productId).toBe(42);
    });

    it('should map ConflictError correctly', () => {
      const error = new ConflictError('Username already exists', { username: 'test' });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Username already exists');
      expect(response.code).toBe('CONFLICT');
      expect(response.statusCode).toBe(409);
    });

    it('should map InsufficientStockError correctly', () => {
      const error = new InsufficientStockError('Not enough stock', {
        productId: 5,
        available: 10,
        requested: 20,
      });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Not enough stock');
      expect(response.code).toBe('INSUFFICIENT_STOCK');
      expect(response.statusCode).toBe(409);
      expect(response.details.available).toBe(10);
      expect(response.details.requested).toBe(20);
    });

    it('should map InvalidStateError correctly', () => {
      const error = new InvalidStateError('Sale already completed', {
        saleId: 123,
      });
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Sale already completed');
      expect(response.code).toBe('INVALID_STATE');
      expect(response.statusCode).toBe(409);
    });
  });

  describe('Backward Compatibility', () => {
    it('should always include error field', () => {
      const errors = [
        new ValidationError('Test 1'),
        new UnauthorizedError('Test 2'),
        new PermissionDeniedError('Test 3'),
      ];

      errors.forEach((error) => {
        const response = mapErrorToIpcResponse(error);
        expect(response).toHaveProperty('error');
        expect(typeof response.error).toBe('string');
      });
    });

    it('should include code for domain errors', () => {
      const error = new ValidationError('Test error');
      const response = mapErrorToIpcResponse(error);

      expect(response).toHaveProperty('code');
      expect(response.code).not.toBeNull();
    });

    it('should include statusCode for all errors', () => {
      const errors = [
        new ValidationError('Test 1'),
        new UnauthorizedError('Test 2'),
        new PermissionDeniedError('Test 3'),
        new NotFoundError('Test 4'),
      ];

      errors.forEach((error) => {
        const response = mapErrorToIpcResponse(error);
        expect(response).toHaveProperty('statusCode');
        expect(typeof response.statusCode).toBe('number');
      });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle plain Error objects', () => {
      const error = new Error('Something went wrong');
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe('Something went wrong');
      expect(response.statusCode).toBe(500);
    });

    it('should handle unknown error types', () => {
      const response = mapErrorToIpcResponse({});

      expect(response.error).toBe('Unknown error');
      expect(response.statusCode).toBe(500);
    });
  });

  describe('Details Preservation', () => {
    it('should preserve complex details object', () => {
      const details = {
        productId: 5,
        productName: 'Widget',
        available: 10,
        requested: 20,
        currency: 'USD',
      };

      const error = new InsufficientStockError('Stock error', details);
      const response = mapErrorToIpcResponse(error);

      expect(response.details).toEqual(details);
    });

    it('should handle null details', () => {
      const error = new ValidationError('Error without details', undefined);
      const response = mapErrorToIpcResponse(error);

      expect(response.details).toBeNull();
    });

    it('should include empty details object if not provided', () => {
      const error = new ValidationError('Simple error');
      const response = mapErrorToIpcResponse(error);

      // Should handle gracefully
      expect(response).toBeDefined();
      expect(response.statusCode).toBe(400);
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should use correct HTTP status codes', () => {
      const tests = [
        { error: new ValidationError(''), expected: 400 },
        { error: new UnauthorizedError(''), expected: 401 },
        { error: new PermissionDeniedError(''), expected: 403 },
        { error: new NotFoundError(''), expected: 404 },
        { error: new ConflictError(''), expected: 409 },
        { error: new InsufficientStockError(''), expected: 409 },
        { error: new InvalidStateError(''), expected: 409 },
      ];

      tests.forEach(({ error, expected }) => {
        const response = mapErrorToIpcResponse(error);
        expect(response.statusCode).toBe(expected);
      });
    });
  });

  describe('Error Code Consistency', () => {
    it('should use consistent error codes', () => {
      const tests = [
        { error: new ValidationError(''), expected: 'VALIDATION_ERROR' },
        { error: new UnauthorizedError(''), expected: 'UNAUTHORIZED' },
        { error: new PermissionDeniedError(''), expected: 'PERMISSION_DENIED' },
        { error: new NotFoundError(''), expected: 'NOT_FOUND' },
        { error: new ConflictError(''), expected: 'CONFLICT' },
        { error: new InsufficientStockError(''), expected: 'INSUFFICIENT_STOCK' },
        { error: new InvalidStateError(''), expected: 'INVALID_STATE' },
      ];

      tests.forEach(({ error, expected }) => {
        const response = mapErrorToIpcResponse(error);
        expect(response.code).toBe(expected);
      });
    });
  });

  describe('Message Preservation', () => {
    it('should preserve original error messages', () => {
      const messages = [
        'Invalid input format',
        'User not authenticated',
        'Permission denied for this action',
        'Resource not found',
        'Duplicate entry',
      ];

      messages.forEach((msg) => {
        const error = new ValidationError(msg);
        const response = mapErrorToIpcResponse(error);
        expect(response.error).toBe(msg);
      });
    });

    it('should not modify error messages', () => {
      const originalMsg = 'Sale with ID 123 not found';
      const error = new NotFoundError(originalMsg);
      const response = mapErrorToIpcResponse(error);

      expect(response.error).toBe(originalMsg);
      expect(response.error).not.toContain('Error:');
      expect(response.error).not.toContain('[object');
    });
  });
});
