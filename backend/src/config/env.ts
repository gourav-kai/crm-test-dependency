import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DB_FILE: z.string().default('./data/mvp-crm.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be >= 32 chars'),
  JWT_TTL_SECONDS: z.coerce.number().default(60 * 60 * 24),
  BCRYPT_COST: z.coerce.number().int().min(10).default(12),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().email(),
  DIGEST_CRON: z.string().default('0 9 * * 1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Bootstrap-only console.error is permitted by the ESLint config (allow: ['warn', 'error']).
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
