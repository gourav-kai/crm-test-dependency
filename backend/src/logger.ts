import pino from 'pino';

import { env } from './config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['password', 'password_hash', 'req.headers.authorization', '*.token', '*.jwt'],
    censor: '[REDACTED]',
  },
  base: { service: 'mvp-crm', env: env.NODE_ENV },
});
