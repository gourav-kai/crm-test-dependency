import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '../../logger';
import { AppError, ValidationError } from '../errors';

/**
 * Centralized error translator. Converts ZodErrors into ValidationError,
 * maps every AppError to its declared HTTP status + structured envelope,
 * and catches all other thrown values as opaque 500 INTERNAL_ERROR responses
 * (with the request id surfaced so clients can correlate with server logs).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let translated: unknown = err;
  if (translated instanceof ZodError) {
    translated = new ValidationError(translated.flatten());
  }

  const reqId = (req as unknown as { id?: string }).id;

  if (translated instanceof AppError) {
    const level = translated.status >= 500 ? 'error' : translated.status >= 401 ? 'warn' : 'info';
    logger[level]({ err: translated, reqId, path: req.path }, translated.message);
    res.status(translated.status).json({
      error: {
        code: translated.code,
        message: translated.message,
        details: translated.details,
      },
    });
    return;
  }

  logger.error({ err: translated, reqId, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', reqId },
  });
};
