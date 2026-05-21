import path from 'node:path';
import fs from 'node:fs';

import Database from 'better-sqlite3';

import { env } from '@/config/env';

/**
 * Ensure the parent directory for the SQLite file exists, then return a
 * `better-sqlite3` Database instance with the project-standard pragmas applied.
 *
 * Exported separately from the shared `db` singleton so tests (and migration
 * tooling targeting an alternate DB path) can construct isolated connections
 * without touching the singleton state.
 *
 * @param dbFile Absolute or relative path to the SQLite database file.
 * @returns A configured `better-sqlite3` Database handle.
 */
export function openDatabase(dbFile: string): Database.Database {
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const conn = new Database(dbFile);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  conn.pragma('synchronous = NORMAL');
  return conn;
}

/**
 * Process-wide shared SQLite client. Repositories MUST import this rather than
 * constructing their own `Database` instance — see patterns § 4.1.
 */
export const db = openDatabase(env.DB_FILE);
