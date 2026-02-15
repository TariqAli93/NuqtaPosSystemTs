import { describe, it, expect } from 'vitest';
import { ok, fail, failWith, toApiError, mapErrorToResult, isOk, isErr } from '../contract';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  PermissionDeniedError,
  DomainError,
} from '../errors/DomainErrors';

describe('Contract helpers', () => {
  describe('ok()', () => {
    it('wraps data in success envelope', () => {
      const result = ok({ id: 1, name: 'Test' });
      expect(result).toEqual({ ok: true, data: { id: 1, name: 'Test' } });
    });

    it('wraps null data', () => {
      const result = ok(null);
      expect(result).toEqual({ ok: true, data: null });
    });

    it('wraps arrays', () => {
      const result = ok([1, 2, 3]);
      expect(result).toEqual({ ok: true, data: [1, 2, 3] });
    });
  });

  describe('fail()', () => {
    it('wraps an ApiError object', () => {
      const apiError = { message: 'Something went wrong', code: 'UNKNOWN_ERROR', status: 500 };
      const result = fail(apiError);
      expect(result).toEqual({ ok: false, error: apiError });
    });
  });

  describe('failWith()', () => {
    it('creates error envelope from code + message', () => {
      const result = failWith('NOT_FOUND', 'Not found', 404);
      expect(result).toEqual({
        ok: false,
        error: { message: 'Not found', code: 'NOT_FOUND', status: 404 },
      });
    });

    it('defaults status to undefined when omitted', () => {
      const result = failWith('BAD', 'Bad');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BAD');
        expect(result.error.status).toBeUndefined();
      }
    });
  });

  describe('isOk() / isErr()', () => {
    it('discriminates success', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it('discriminates failure', () => {
      const result = fail({ code: 'ERR', message: 'err' });
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('toApiError()', () => {
    it('maps ValidationError to 400 VALIDATION_ERROR', () => {
      const err = new ValidationError('Bad input');
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.status).toBe(400);
      expect(apiErr.message).toBe('Bad input');
    });

    it('maps NotFoundError to 404 NOT_FOUND', () => {
      const err = new NotFoundError('Missing');
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('NOT_FOUND');
      expect(apiErr.status).toBe(404);
    });

    it('maps UnauthorizedError to 401 UNAUTHORIZED', () => {
      const err = new UnauthorizedError('No token');
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('UNAUTHORIZED');
      expect(apiErr.status).toBe(401);
    });

    it('maps PermissionDeniedError to 403 PERMISSION_DENIED', () => {
      const err = new PermissionDeniedError('Forbidden');
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('PERMISSION_DENIED');
      expect(apiErr.status).toBe(403);
    });

    it('maps generic DomainError to its code/statusCode', () => {
      const err = new DomainError('CUSTOM', 'Domain issue', 422);
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('CUSTOM');
      expect(apiErr.status).toBe(422);
    });

    it('maps unknown Error to INTERNAL_ERROR 500-like', () => {
      const err = new Error('Unexpected');
      const apiErr = toApiError(err);
      expect(apiErr.code).toBe('INTERNAL_ERROR');
      expect(apiErr.message).toBe('Unexpected');
    });

    it('maps non-Error to INTERNAL_ERROR with string coercion', () => {
      const apiErr = toApiError('random string');
      expect(apiErr.code).toBe('INTERNAL_ERROR');
      expect(apiErr.message).toBe('random string');
    });
  });

  describe('mapErrorToResult()', () => {
    it('always returns { ok: false, error: ApiError }', () => {
      const result = mapErrorToResult(new ValidationError('Bad'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.status).toBe(400);
      }
    });

    it('handles null/undefined gracefully', () => {
      const result = mapErrorToResult(null);
      expect(result.ok).toBe(false);
    });
  });
});
