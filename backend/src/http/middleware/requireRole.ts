import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors';

export function requireRole(role: 'admin' | 'sales'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.role !== role) return next(new ForbiddenError());
    next();
  };
}
