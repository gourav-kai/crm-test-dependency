import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireRole } from './requireRole';
import { authMiddleware, signToken } from './auth';
import { errorHandler } from './errorHandler';

function mkApp() {
  const app = express();
  app.get('/admin-only', authMiddleware, requireRole('admin'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requireRole', () => {
  it('lets admin through', async () => {
    const t = signToken({ id: 1, role: 'admin' });
    const res = await request(mkApp()).get('/admin-only').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
  });
  it('returns 403 for sales', async () => {
    const t = signToken({ id: 1, role: 'sales' });
    const res = await request(mkApp()).get('/admin-only').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
  it('returns 401 when no token at all', async () => {
    const res = await request(mkApp()).get('/admin-only');
    expect(res.status).toBe(401);
  });
});
