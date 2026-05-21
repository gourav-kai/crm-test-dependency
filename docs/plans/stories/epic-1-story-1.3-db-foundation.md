### Story 1.3: DB Foundation

**Epic**: 1 - PROJECT FOUNDATION | **ID**: 1.3 | **Date**: 2026-05-19 | **GitHub**: #3
**Requires**: []
**Enables**: [1.4, 2.2, 4.1, 6.1]
**Files Touched**:
  - backend/package.json
  - backend/src/db/client.ts
  - backend/src/db/migrate.ts
  - backend/migrations/
  - backend/scripts/seed.ts
  - backend/src/server.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Data Model (USERS, LEADS, DIGEST_RUNS), § DR-2 (better-sqlite3), constraints & indexes.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 4 (Database Access), § 1.2 (naming — snake_case columns), Anti-patterns.

**Description**:
Establishes the SQLite layer for the backend: a single shared `better-sqlite3` client with WAL pragmas, a tiny in-house migration runner that applies numbered `.sql` files transactionally, the initial schema (`users`, `leads`, `digest_runs` + indexes + CHECK constraints) as `0001_init.sql`, and a `seed.ts` script that creates the initial Admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Also wires `server.ts` to run migrations on boot so the dev experience is `npm run dev` → schema is up-to-date. This story does NOT add any repositories or services (those land per feature in their epics) and does NOT touch the API layer beyond the boot hook.

**Acceptance Criteria**:
- `npm --workspace backend run dev` runs migrations idempotently on every boot and logs `{msg:"migrations applied",count:N}`.
- After first boot, `backend/data/mvp-crm.db` exists with tables: `users`, `leads`, `digest_runs`, `_migrations`.
- WAL is enabled (`PRAGMA journal_mode` returns `wal`); `foreign_keys = ON`; `synchronous = NORMAL`.
- `0001_init.sql` creates all 3 tables with the exact columns from architecture § Data Model, the listed CHECK constraints, and the indexes `idx_leads_owner_id` + `idx_leads_stage`.
- `_migrations(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)` tracks applied migrations; running migrations twice does not re-apply.
- A failing SQL inside a migration aborts the transaction (DB unchanged) and exits non-zero.
- Migrations are applied in lexicographic filename order.
- `npm --workspace backend run seed` reads `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` from env; on missing vars, exits with a clear error; on existing email, exits 0 with `{msg:"admin already exists"}`; on success creates the row with `role='admin'`, `active=1`, bcrypt-hashed password (cost from `BCRYPT_COST`).
- `users.email` is stored lowercased; unique constraint enforced.
- `npm --workspace backend run test` includes a migration runner test that asserts: applies a tmp migration, records it in `_migrations`, second run is a no-op.

**Prerequisites**: None (root story).

**Context**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — Data Model, Seed section.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 4.1 client, § 4.4 migrations.

**Patterns**: DB client + pragmas (§4.1), prepared statements (§4.2), parameterized queries only (§4.5) — `docs/architecture/design/01-patterns-and-standards-greenfield.md`.

**Steps**:

1. **Add deps to `backend/package.json`** (the shared file — extend existing `dependencies`):
   ```json
   {
     "dependencies": {
       "bcrypt": "5.1.1",
       "better-sqlite3": "11.3.0"
     },
     "devDependencies": {
       "@types/bcrypt": "^5.0.2",
       "@types/better-sqlite3": "^7.6.11"
     },
     "scripts": {
       "seed": "tsx scripts/seed.ts",
       "migrate": "tsx -e \"import('./src/db/migrate.js').then(m=>m.runMigrations())\""
     }
   }
   ```
   (Pin exact for security-critical per patterns § 1.5.)

2. **DB client** — `backend/src/db/client.ts`:
   ```ts
   import Database from 'better-sqlite3';
   import path from 'node:path';
   import fs from 'node:fs';
   import { env } from '@/config/env';

   const dir = path.dirname(env.DB_FILE);
   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

   export const db = new Database(env.DB_FILE);
   db.pragma('journal_mode = WAL');
   db.pragma('foreign_keys = ON');
   db.pragma('synchronous = NORMAL');
   ```

3. **Migration runner** — `backend/src/db/migrate.ts`:
   ```ts
   import fs from 'node:fs';
   import path from 'node:path';
   import { db } from './client';
   import { logger } from '@/logger';

   const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

   export function runMigrations(): { count: number } {
     db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
       id INTEGER PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       applied_at TEXT NOT NULL
     )`);
     const applied = new Set(
       (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
     );
     const files = fs
       .readdirSync(MIGRATIONS_DIR)
       .filter((f) => f.endsWith('.sql'))
       .sort();
     const insert = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');
     let count = 0;
     for (const file of files) {
       if (applied.has(file)) continue;
       const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
       const tx = db.transaction(() => {
         db.exec(sql);
         insert.run(file, new Date().toISOString());
       });
       tx();
       count++;
       logger.info({ migration: file }, 'migration applied');
     }
     logger.info({ count }, 'migrations applied');
     return { count };
   }
   ```

4. **Initial schema** — `backend/migrations/0001_init.sql`:
   ```sql
   CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     full_name TEXT NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('admin','sales')),
     active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );

   CREATE TABLE leads (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     opportunity_name TEXT NOT NULL,
     notes TEXT,
     contact_person TEXT NOT NULL,
     estimated_closing_date TEXT NOT NULL,
     lead_value REAL NOT NULL CHECK (lead_value >= 0),
     stage TEXT NOT NULL DEFAULT 'Evaluating'
       CHECK (stage IN ('Evaluating','Proposing','Solutioning','Complete')),
     owner_id INTEGER NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
   );

   CREATE INDEX idx_leads_owner_id ON leads(owner_id);
   CREATE INDEX idx_leads_stage    ON leads(stage);

   CREATE TABLE digest_runs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     run_at TEXT NOT NULL,
     triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','manual')),
     recipients_count INTEGER NOT NULL,
     success_count INTEGER NOT NULL,
     failure_count INTEGER NOT NULL,
     notes TEXT
   );
   ```

5. **Seed script** — `backend/scripts/seed.ts`:
   ```ts
   import bcrypt from 'bcrypt';
   import { db } from '../src/db/client';
   import { runMigrations } from '../src/db/migrate';
   import { env } from '../src/config/env';
   import { logger } from '../src/logger';

   async function main() {
     runMigrations();
     const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
     const password = env.SEED_ADMIN_PASSWORD;
     if (!email || !password) {
       console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
       process.exit(1);
     }
     const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
     if (existing) {
       logger.info({ email }, 'admin already exists');
       return;
     }
     const hash = await bcrypt.hash(password, env.BCRYPT_COST);
     const now = new Date().toISOString();
     db.prepare(`INSERT INTO users (email, password_hash, full_name, role, active, created_at, updated_at)
                 VALUES (?, ?, ?, 'admin', 1, ?, ?)`)
       .run(email, hash, 'Admin', now, now);
     logger.info({ email }, 'admin seeded');
   }
   main();
   ```

6. **Wire migrations on boot** — patch `backend/src/server.ts` (shared file from 1.1):
   ```ts
   import { buildApp } from './app';
   import { env } from './config/env';
   import { logger } from './logger';
   import { runMigrations } from './db/migrate';

   runMigrations();   // <-- new line; runs on every boot, idempotent
   const app = buildApp();
   app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'server listening'));
   ```

**Tests**:

```ts
// backend/src/db/migrate.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

describe('migration runner', () => {
  const tmpDir = path.join(__dirname, '__tmp__');
  const dbFile = path.join(tmpDir, 'test.db');
  const migDir = path.join(tmpDir, 'migrations');

  beforeEach(() => {
    fs.mkdirSync(migDir, { recursive: true });
    fs.writeFileSync(path.join(migDir, '0001_a.sql'), 'CREATE TABLE a (id INTEGER PRIMARY KEY);');
    fs.writeFileSync(path.join(migDir, '0002_b.sql'), 'CREATE TABLE b (id INTEGER PRIMARY KEY);');
  });
  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('applies migrations in lex order and records them', async () => {
    process.env.DB_FILE = dbFile;
    const { runMigrationsAt } = await import('./migrate-testkit'); // injected helper
    const r1 = runMigrationsAt(dbFile, migDir);
    expect(r1.count).toBe(2);
    const r2 = runMigrationsAt(dbFile, migDir);
    expect(r2.count).toBe(0);
    const conn = new Database(dbFile);
    const rows = conn.prepare('SELECT name FROM _migrations ORDER BY id').all() as any[];
    expect(rows.map((r) => r.name)).toEqual(['0001_a.sql', '0002_b.sql']);
  });
});
```

*Implementation note*: extract a small `runMigrationsAt(dbPath, dir)` helper in `migrate.ts` so the test can target a tmp DB without env-coupling. The exported `runMigrations()` is the env-coupled convenience wrapper.

Manual tests:
- `npm --workspace backend run dev` → DB file created at `backend/data/mvp-crm.db`; log shows `count: 1`.
- Run again → log shows `count: 0`.
- `sqlite3 backend/data/mvp-crm.db ".schema"` → matches `0001_init.sql`.
- Set `SEED_ADMIN_EMAIL=admin@example.com` + `SEED_ADMIN_PASSWORD=adminadmin123` in `.env`; `npm --workspace backend run seed` → row inserted; second run → "admin already exists" log line.

**Quality**: ESLint 0; Vitest passes; coverage ≥85% on changed files; no string-concat SQL anywhere; no SQL outside `db/` directory.

**OUT**:
- ❌ Any repository or service (users, leads, digest) — feature stories.
- ❌ Any HTTP routes — feature stories.
- ❌ Refresh-token table — out of scope per requirements.
- ❌ Audit/change-history table — out of scope.

**Evidence**: `sqlite3 backend/data/mvp-crm.db ".schema"` output, structured log line from a successful boot showing `count:0` on the second run, output of seed script.
