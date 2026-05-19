import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { buildApp } from '@/app';
import { db } from '@/db/client';
import { AppError, ValidationError } from '@/http/errors';
import { errorHandler } from '@/http/middleware/errorHandler';
import { requestId } from '@/http/middleware/requestId';

describe('GET /api/health', () => {
  const app = buildApp();
  afterEach(() => vi.restoreAllMocks());

  it('returns 200 + { ok: true, backend: ok, db: ok } when DB is reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ ok: true, backend: 'ok', db: 'ok' });
  });

  it('returns 503 + db=down when the SQLite SELECT 1 fails', async () => {
    vi.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('db unreachable');
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, backend: 'ok', db: 'down' });
  });

  it('returns 404 with NOT_FOUND envelope on unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Route not found');
  });
});

describe('errorHandler integration', () => {
  /**
   * Builds a small Express app that mirrors the production middleware chain
   * but mounts a synthetic throwing route. This exercises the errorHandler's
   * non-AppError catch-all path (the 500 INTERNAL_ERROR envelope) without
   * depending on private Express internals.
   */
  function buildAppWithThrowingRoute(thrown: unknown) {
    const app = express();
    app.use(requestId);
    app.use(cors());
    app.get('/api/boom', (_req, _res, next) => next(thrown));
    app.use(errorHandler);
    return app;
  }

  it('returns 500 INTERNAL_ERROR envelope with reqId on unhandled error', async () => {
    const app = buildAppWithThrowingRoute(new Error('boom'));
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.reqId).toBeTruthy();
  });

  it('propagates the reqId from an inbound x-request-id header', async () => {
    const app = buildAppWithThrowingRoute(new Error('boom'));
    const res = await request(app).get('/api/boom').set('x-request-id', 'fixed-req-id-123');
    expect(res.body.error.reqId).toBe('fixed-req-id-123');
  });

  it('maps an AppError subclass to its declared status and code', async () => {
    class TeapotError extends AppError {
      constructor() {
        super('IM_A_TEAPOT', 418, 'I am a teapot');
      }
    }
    const app = buildAppWithThrowingRoute(new TeapotError());
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(418);
    expect(res.body.error).toEqual({
      code: 'IM_A_TEAPOT',
      message: 'I am a teapot',
      details: undefined,
    });
  });

  it('translates a ZodError into a 422 VALIDATION_ERROR envelope', async () => {
    const { z } = await import('zod');
    const zodErr = z.object({ name: z.string() }).safeParse({}).error;
    const app = buildAppWithThrowingRoute(zodErr);
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });

  it('ValidationError exposes structured details', () => {
    const err = new ValidationError({ field: ['required'] });
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: ['required'] });
  });
});
