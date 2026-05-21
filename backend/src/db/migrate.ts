import fs from 'node:fs';
import path from 'node:path';

import type Database from 'better-sqlite3';

import { db } from './client';
import { openDatabase } from './client';

import { env } from '@/config/env';
import { logger } from '@/logger';

/**
 * Default location of on-disk migration `.sql` files. Resolved relative to the
 * compiled file so the runner works from both `src/` (tsx) and `dist/` (node).
 */
const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
  )
`;

export interface MigrationResult {
  count: number;
  applied: string[];
}

/**
 * Apply all pending migrations from `migrationsDir` to the given database
 * connection. Each migration runs inside its own transaction — a failure
 * aborts that transaction and surfaces the error to the caller, leaving the
 * database state consistent with the prior migration.
 *
 * Pure / dependency-injected: this is the function exercised by unit tests.
 * Callers running against the application DB should use {@link runMigrations}.
 */
export function applyMigrations(
  conn: Database.Database,
  migrationsDir: string,
): MigrationResult {
  conn.exec(CREATE_MIGRATIONS_TABLE);

  const appliedRows = conn
    .prepare('SELECT name FROM _migrations')
    .all() as { name: string }[];
  const alreadyApplied = new Set(appliedRows.map((r) => r.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const insert = conn.prepare(
    'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
  );

  const applied: string[] = [];
  for (const file of files) {
    if (alreadyApplied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tx = conn.transaction(() => {
      conn.exec(sql);
      insert.run(file, new Date().toISOString());
    });
    tx();
    applied.push(file);
    logger.info({ migration: file }, 'migration applied');
  }

  return { count: applied.length, applied };
}

/**
 * Test-friendly entry point: open a fresh connection against `dbPath`, apply
 * migrations from `migrationsDir`, and close the connection.
 *
 * The fresh-connection-per-call shape means concurrent test cases don't share
 * cached prepared statements or pragma state.
 */
export function runMigrationsAt(
  dbPath: string,
  migrationsDir: string,
): MigrationResult {
  const conn = openDatabase(dbPath);
  try {
    return applyMigrations(conn, migrationsDir);
  } finally {
    conn.close();
  }
}

/**
 * Production entry point: apply pending migrations to the shared `db`
 * singleton using the on-disk migrations directory. Called by `server.ts` on
 * every boot — safe to invoke repeatedly because already-applied migrations
 * are skipped via the `_migrations` table.
 */
export function runMigrations(): MigrationResult {
  const result = applyMigrations(db, DEFAULT_MIGRATIONS_DIR);
  logger.info({ count: result.count }, 'migrations applied');
  return result;
}

// `env` is intentionally imported to ensure the env schema is validated at
// module load even when only `runMigrations` is invoked (matches server boot
// expectations). Reference it to keep the import in the dependency graph.
void env;
