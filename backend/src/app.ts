import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { NotFoundError } from './http/errors';
import { authMiddleware } from './http/middleware/auth';
import { errorHandler } from './http/middleware/errorHandler';
import { requestId } from './http/middleware/requestId';
import { healthRouter } from './features/_health/health.routes';
import { logger } from './logger';
import { apiRouter } from './routes';

/**
 * Composition root for the HTTP application. Wires the middleware chain per patterns § 5.4:
 *   requestId -> pino-http -> cors -> json
 *   -> /api/auth (public, mounted by 2.2)
 *   -> authMiddleware (all other /api routes require a valid JWT)
 *   -> /api routes -> 404 -> errorHandler.
 * Exported as a factory so tests can build isolated app instances.
 */
export function buildApp() {
  const app = express();
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ reqId: req.id, userId: req.user?.id }),
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  // Public routes — no JWT required:
  app.use('/api/health', healthRouter);
  // app.use('/api/auth', authRouter);    // added by story 2.2
  app.use('/api', authMiddleware);
  app.use('/api', apiRouter);
  app.use((_req, _res, next) => next(new NotFoundError('Route')));
  app.use(errorHandler);
  return app;
}
