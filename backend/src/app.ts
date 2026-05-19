import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { NotFoundError } from './http/errors';
import { errorHandler } from './http/middleware/errorHandler';
import { requestId } from './http/middleware/requestId';
import { logger } from './logger';
import { apiRouter } from './routes';

/**
 * Composition root for the HTTP application. Wires the middleware chain in
 * the order documented in the patterns doc:
 *   requestId -> pino-http -> cors -> json -> /api routes -> 404 -> errorHandler.
 * Exported as a factory so tests can build isolated app instances.
 */
export function buildApp() {
  const app = express();
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ reqId: (req as unknown as { id?: string }).id }),
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiRouter);
  app.use((_req, _res, next) => next(new NotFoundError('Route')));
  app.use(errorHandler);
  return app;
}
