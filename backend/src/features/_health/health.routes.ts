import { Router } from 'express';

import { checkHealth } from './health.service';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body = checkHealth();
  res.status(body.ok ? 200 : 503).json(body);
});
