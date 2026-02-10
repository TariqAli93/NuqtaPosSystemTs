/**
 * Domain Errors Tests
 * Validates typed error classes and error mapping
 */
import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  UnauthorizedError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  InsufficientStockError,
  InvalidStateError,
} from '@nuqtaplus/core';

describe('DomainErrors', () => {
  describe('DomainError (base)', () => {
    it('should create base domain error', () => {
      const error = new DomainError('Test error message');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('DOMAIN_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should include details in error', () => {
      const details = { userId: 1, actionId: 42 };
      const error = new DomainError('Test error', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should have correct status code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should preserve details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new ValidationError('Invalid email', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('UnauthorizedError', () => {
    it('should have 401 status code', () => {
      const error = new UnauthorizedError('Not authenticated');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PermissionDeniedError', () => {
    it('should have 403 status code', () => {
      const error = new PermissionDeniedError('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('PERMISSION_DENIED');
    });

    it('should include required permission in details', () => {
      const error = new PermissionDeniedError('Access denied', {
        required: 'sales:create',
      });
      expect(error.details.required).toBe('sales:create');
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status code', () => {
      const error = new ConflictError('Conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('InsufficientStockError', () => {
    it('should have 409 status code', () => {
      const error = new InsufficientStockError('Not enough stock');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should track stock details', () => {
      const error = new InsufficientStockError('Not enough stock', {
        productId: 5,
        available: 10,
        requested: 20,
      });
      expect(error.details.available).toBe(10);
      expect(error.details.requested).toBe(20);
    });
  });

  describe('InvalidStateError', () => {
    it('should have 409 status code', () => {
      const error = new InvalidStateError('Invalid state');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('INVALID_STATE');
    });
  });

  describe('Error Instanceof Checks', () => {
    it('should be instanceof Error', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof DomainError', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should distinguish between error types', () => {
      const validationError = new ValidationError('Test');
      const authError = new UnauthorizedError('Test');
      const permError = new PermissionDeniedError('Test');

      expect(validationError).toBeInstanceOf(ValidationError);
      expect(authError).toBeInstanceOf(UnauthorizedError);
      expect(permError).toBeInstanceOf(PermissionDeniedError);

      expect(validationError).not.toBeInstanceOf(UnauthorizedError);
      expect(authError).not.toBeInstanceOf(ValidationError);
    });
  });

  describe('Error Stack Traces', () => {
    it('should have stack trace', () => {
      const error = new ValidationError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize to JSON with key properties', () => {
      const error = new ValidationError('Test error', { field: 'email' });
      const json = {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      };

      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.statusCode).toBe(400);
      expect(json.details.field).toBe('email');
    });
  });

  describe('Multiple Details', () => {
    it('should handle complex details object', () => {
      const details = {
        required: 'sales:delete',
        userRole: 'cashier',
        allowedRoles: ['admin', 'manager'],
      };
      const error = new PermissionDeniedError('Permission denied', details);
      expect(error.details).toEqual(details);
      expect(error.details.allowedRoles).toEqual(['admin', 'manager']);
    });
  });
});
