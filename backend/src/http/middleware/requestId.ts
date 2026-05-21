import type { RequestHandler } from 'express';
import { v4 as uuid } from 'uuid';

/**
 * Assigns a stable request identifier to every incoming request. Honors a
 * caller-supplied `x-request-id` header (useful for client/edge tracing) and
 * falls back to a fresh UUIDv4 otherwise. Downstream middleware (pino-http,
 * errorHandler) read `req.id` to correlate logs and responses.
 */
export const requestId: RequestHandler = (req, _res, next) => {
  (req as unknown as { id: string }).id = req.header('x-request-id') ?? uuid();
  next();
};
