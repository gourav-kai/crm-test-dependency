import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';

describe('AppError hierarchy', () => {
  it('AppError carries code, status, message, and details', () => {
    const err = new AppError('X', 418, 'teapot', { hint: 'tea' });
    expect(err.code).toBe('X');
    expect(err.status).toBe(418);
    expect(err.message).toBe('teapot');
    expect(err.details).toEqual({ hint: 'tea' });
    expect(err.name).toBe('AppError');
  });

  it('ValidationError defaults to 422 with VALIDATION_ERROR code', () => {
    const err = new ValidationError({ field: ['required'] });
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Validation failed');
    expect(err.details).toEqual({ field: ['required'] });
  });

  it('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError templates the resource name', () => {
    const err = new NotFoundError('User');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
  });

  it('ConflictError carries the supplied message at 409', () => {
    const err = new ConflictError('email already in use');
    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('email already in use');
  });
});
