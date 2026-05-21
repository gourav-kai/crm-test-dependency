import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authMiddleware, signToken } from './auth';
import { errorHandler } from './errorHandler';
import { env } from '@/config/env';

function mkApp() {
  const app = express();
  app.get('/protected', authMiddleware, (req, res) => res.json({ user: req.user }));
  app.use(errorHandler);
  return app;
}

describe('authMiddleware', () => {
  it('attaches req.user on a valid token', async () => {
    const token = signToken({ id: 42, role: 'sales' });
    const res = await request(mkApp()).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 42, role: 'sales' });
  });
  it.each([
    ['missing header', () => undefined],
    ['junk header', () => 'NotBearer xyz'],
    ['malformed token', () => 'Bearer abc.def.ghi'],
    ['wrong secret', () => `Bearer ${jwt.sign({ role: 'admin' }, 'wrong-secret-32-chars-min-aaaaa', { subject: '1' })}`],
    ['expired', () => `Bearer ${jwt.sign({ role: 'admin' }, env.JWT_SECRET, { subject: '1', expiresIn: -10 })}`],
    ['bad role', () => `Bearer ${jwt.sign({ role: 'hacker' }, env.JWT_SECRET, { subject: '1' })}`],
  ])('returns 401 when %s', async (_label, mk) => {
    const req = request(mkApp()).get('/protected');
    const h = mk();
    const res = await (h ? req.set('Authorization', h) : req);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
