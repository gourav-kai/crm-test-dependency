import { Router } from 'express';

import { healthRouter } from './features/_health/health.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
// Future feature routers mount here (auth, users, leads, analytics, admin).
