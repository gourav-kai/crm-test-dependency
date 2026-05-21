import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './logger';
import { runMigrations } from './db/migrate';

runMigrations();
const app = buildApp();
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});
