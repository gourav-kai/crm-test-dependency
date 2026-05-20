import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UnauthorizedError } from '../errors';

interface JwtPayload { sub: string | number; role: 'admin' | 'sales'; iat: number; exp: number; }

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError());
  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!payload?.sub || (payload.role !== 'admin' && payload.role !== 'sales')) {
      return next(new UnauthorizedError());
    }
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError());
  }
};

export function signToken(user: { id: number; role: 'admin' | 'sales' }): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_TTL_SECONDS,
    algorithm: 'HS256',
  });
}
