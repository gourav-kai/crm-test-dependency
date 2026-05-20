import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
    });
  },
});
