import bcrypt from 'bcrypt';
import { db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { env } from '../src/config/env';
import { logger } from '../src/logger';

/**
 * Seed script entry point. Idempotent: re-running with an existing admin
 * email is a no-op that exits 0. Requires SEED_ADMIN_EMAIL and
 * SEED_ADMIN_PASSWORD env vars.
 */
async function main(): Promise<void> {
  runMigrations();

  const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    // Use console.error so the message is visible even when LOG_LEVEL hides
    // logger output; missing-env is an operator-facing condition.
    console.error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env',
    );
    process.exit(1);
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);
  if (existing) {
    logger.info({ email }, 'admin already exists');
    return;
  }

  const hash = await bcrypt.hash(password, env.BCRYPT_COST);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (email, password_hash, full_name, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 1, ?, ?)`,
  ).run(email, hash, 'Admin', now, now);

  logger.info({ email }, 'admin seeded');
}

main().catch((err) => {
  logger.error({ err }, 'seed failed');
  process.exit(1);
});
