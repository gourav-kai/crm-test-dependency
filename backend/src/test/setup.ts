process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '4000';
process.env.DB_FILE = process.env.DB_FILE ?? ':memory:';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-with-at-least-32-characters-aaaa';
process.env.JWT_TTL_SECONDS = process.env.JWT_TTL_SECONDS ?? '86400';
process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '10';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '2525';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? 'test';
process.env.SMTP_FROM = process.env.SMTP_FROM ?? 'test@example.com';
process.env.DIGEST_CRON = process.env.DIGEST_CRON ?? '0 9 * * 1';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
