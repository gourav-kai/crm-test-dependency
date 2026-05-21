# Story 1.3 — DB Foundation (Self-Review)

**Story**: Epic 1 / Story 1.3 — DB Foundation (client, migrations runner, initial schema, seed)
**Assignee**: abhigyan.ranjan@3pillarglobal.com
**Date**: 2026-05-19
**Mode**: Parallel subagent (Mode 2), dispatched alongside Story 1.1.
**Status**: 🟡 In Progress — production code complete; test execution & lint deferred to parent post-merge (Story 1.1 has not yet installed backend `node_modules`, and `backend/package.json` requires parent-serialized edits to add `bcrypt` + `better-sqlite3`).

---

## Files Changed

| Path | Status | Notes |
|------|--------|-------|
| `backend/src/db/client.ts` | new | Exports `openDatabase()` factory + shared `db` singleton with WAL/FK/synchronous pragmas. |
| `backend/src/db/migrate.ts` | new | `applyMigrations` (DI), `runMigrationsAt` (test entry), `runMigrations` (env-coupled, used by `server.ts` and `seed.ts`). |
| `backend/migrations/0001_init.sql` | new | `users`, `leads`, `digest_runs` tables + `idx_leads_owner_id`, `idx_leads_stage`. All CHECK constraints per architecture § Data Model. |
| `backend/scripts/seed.ts` | new | Reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, hashes with bcrypt at `env.BCRYPT_COST`, lowercases email, idempotent on existing admin. |
| `backend/src/db/client.test.ts` | new (test) | Verifies pragmas + parent-dir creation + working connection. |
| `backend/src/db/migrate.test.ts` | new (test) | Lex-order apply, idempotency, transactional rollback on bad SQL, non-`.sql` filtering, tracking-table schema. |

**Files NOT edited (parent-serialization required — see below)**:
- `backend/package.json` (shared_files; also in Story 1.1's `files_touched`).
- `backend/src/server.ts` (shared_files; also in Story 1.1's `files_touched`).

---

## Patterns Applied

| Pattern (source) | Where |
|------------------|-------|
| § 4.1 Single shared `better-sqlite3` client with WAL/FK/synchronous pragmas | `backend/src/db/client.ts` |
| § 4.3 `db.transaction()` for atomic migration apply | `backend/src/db/migrate.ts` — each migration wrapped in `conn.transaction(() => …)` |
| § 4.4 Pure SQL files in `backend/migrations/NNNN_*.sql`, applied in lex order, tracked in `_migrations(id, name, applied_at)` | `0001_init.sql` + `migrate.ts` |
| § 4.5 Parameterized queries only — no string-concat SQL | `seed.ts` uses `?`-parameter binding; migrations are static SQL files. |
| § 1.2 snake_case columns | `0001_init.sql` (`opportunity_name`, `password_hash`, …) |
| DI / SOLID — `applyMigrations(conn, dir)` accepts dependencies as args; `runMigrations()` is the thin env-coupled wrapper | `migrate.ts` |
| File-size limits (AIRE_DEV anti-monolith) | `client.ts` ~30 LOC; `migrate.ts` ~95 LOC; `seed.ts` ~45 LOC. |

---

## Testing Summary

**Test files written**: `backend/src/db/client.test.ts`, `backend/src/db/migrate.test.ts`
**Test count**: 8 cases total
  - `openDatabase`: 3 (dir creation, pragmas, executes SQL)
  - `migration runner`: 5 (lex-order, idempotency, rollback, non-`.sql` filter, `_migrations` schema)

**Execution status**: **deferred** to parent post-merge.

**Reason for deferral**: At the time of this subagent's run, Story 1.1 (parallel) has scaffolded `backend/package.json` + `backend/vitest.config.ts` but has NOT yet run `npm install`, and the package.json does not yet include the `better-sqlite3` / `bcrypt` dependencies my code requires (per parallel-subagent contract I cannot edit it). The parent must:
  1. Apply the package.json edits below.
  2. Run `npm install` in `backend/`.
  3. Then execute `npm --workspace backend run test` and `npm --workspace backend run lint`.

**Expected test command** (post-merge):
```
npm --workspace backend run test
```

**Expected lint command** (post-merge):
```
npm --workspace backend run lint
```

**Coverage target**: ≥85% on `src/db/client.ts` + `src/db/migrate.ts`. The 8 tests cover every branch in both files (parent-dir-exists vs not, applied vs unapplied migration, success vs rollback path, non-`.sql` filter, second-run no-op). The `seed.ts` script is not unit-tested in this story — coverage of seed is via the manual test listed in the story (matches story Tests section, which only mandates a migration runner test).

---

## DoD Evidence

### Gate 1 — Spec Echo

| Requirement (story) | Proof |
|---|---|
| Migrations run idempotently on boot, log `{msg:"migrations applied",count:N}` | `migrate.ts:96` — `logger.info({ count: result.count }, 'migrations applied')` inside `runMigrations()`. To be wired into `server.ts` by parent. |
| `backend/data/mvp-crm.db` exists after first boot, with `users`, `leads`, `digest_runs`, `_migrations` | `0001_init.sql:7,17,35` (3 tables) + `migrate.ts:18-22` (`_migrations` create) + `client.ts:20` (mkdir parent). |
| WAL enabled, `foreign_keys=ON`, `synchronous=NORMAL` | `client.ts:24-26`. Asserted in `client.test.ts:35-49`. |
| `0001_init.sql` creates 3 tables w/ exact columns, CHECK constraints, indexes `idx_leads_owner_id` + `idx_leads_stage` | `0001_init.sql:7-44` matches architecture § Data Model verbatim. |
| `_migrations(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)`, idempotent | `migrate.ts:13-19`. Idempotency asserted in `migrate.test.ts` "should be a no-op on the second run". |
| Failing SQL aborts transaction, DB unchanged, exits non-zero | `migrate.ts:55-60` (`conn.transaction(...)` — better-sqlite3 auto-rolls-back on throw, and the throw propagates). Asserted in `migrate.test.ts` "should roll back the failing migration". Non-zero exit is the natural Node behavior of an uncaught throw in `runMigrations()` — `server.ts` and `seed.ts` both invoke it without catching, so process exits non-zero. |
| Migrations applied in lexicographic filename order | `migrate.ts:44-47` (`.sort()` after filter). Asserted in `migrate.test.ts` "should apply migrations in lexicographic order". |
| `seed` reads env, errors clearly on missing, exits 0 with "admin already exists" on existing, creates row on success | `seed.ts:17-28` (missing-env → console.error + exit 1); `seed.ts:30-35` (existing → log + return); `seed.ts:37-43` (create with bcrypt + role='admin' + active=1). |
| `users.email` stored lowercased; unique enforced | `seed.ts:15` (`.toLowerCase()`); `0001_init.sql:9` (`email TEXT NOT NULL UNIQUE`). |
| Migration runner test: applies tmp migration, records, second run no-op | `migrate.test.ts` cases 1 and 2. |

### Gate 2 — Negative-Space Check

| "Must NOT" rule | Reproducible check |
|---|---|
| No string-concat SQL anywhere | `Grep` pattern `\\$\\{.*\\}` or backtick interpolation inside `db.prepare`/`db.exec` calls under `backend/src/db/` and `backend/scripts/seed.ts` returns zero hits. All SQL is either static literals or `?`/named-parameter prepared statements. |
| No SQL outside `db/` directory | This story does NOT introduce any repository or service. The only SQL outside `db/` is `scripts/seed.ts` (admin bootstrap), which is the explicit exception called out in the story's seed step. |
| No repositories or services for users/leads/digest in this story | `Glob` `backend/src/features/**` returns no new files from this story. |
| No HTTP routes added | This story's `files_touched` includes no route files. |
| No refresh-token table, no audit table in `0001_init.sql` | `Grep -i "refresh|audit"` against `0001_init.sql` returns 0. |
| No TODO/FIXME in production code | `Grep -nE "TODO|FIXME"` against new files returns 0. |
| No commented-out code | Manual diff review: comments in new files are docstrings explaining WHY (per AIRE_DEV § Comments), never disabled code. |
| No hardcoded secrets | Bcrypt cost, admin email, admin password all sourced from `env`. No literal credentials in source. |

### Gate 3 — Contract Consistency

| Layer A | Layer B | Match |
|---|---|---|
| Story spec: migration runner uses `_migrations(id, name, applied_at)` | `migrate.ts:13-19` `CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL)` | ✅ verbatim |
| Story spec: pragmas `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL` | `client.ts:24-26` | ✅ verbatim |
| Architecture § Data Model: `users` columns | `0001_init.sql:7-15` | ✅ verbatim |
| Architecture § Data Model: `leads` columns + indexes | `0001_init.sql:17-34` | ✅ verbatim |
| Architecture § Data Model: `digest_runs` columns | `0001_init.sql:36-44` | ✅ verbatim |
| Story seed step: lowercases email, hashes with `env.BCRYPT_COST`, role='admin', active=1 | `seed.ts:15, 37-43` | ✅ |
| Test contract: helper `runMigrationsAt(dbPath, dir)` for env-decoupled tests (per story's "Implementation note") | `migrate.ts:74-83` exports `runMigrationsAt`; used in `migrate.test.ts`. | ✅ |
| Env schema (`patterns § 6.1`): `DB_FILE`, `BCRYPT_COST`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | `client.ts` reads `env.DB_FILE`; `seed.ts` reads the other three. Validated at module load via `env` import. | ✅ |

**Sign-off**: All three gates have evidence rows. Test EXECUTION is deferred; **gate logic** is intact (every row above can be verified by reading the cited file:line in the diff).

---

## Parent-Serialization Requests

These edits touch files in `shared_files` and Story 1.1's `files_touched`. The parent must apply them after both subagents return and 1.1 has merged.

### 1. `backend/package.json` — add `bcrypt` + `better-sqlite3` deps and seed/migrate scripts

```diff
   "scripts": {
     "dev": "tsx watch src/server.ts",
     "build": "tsc -p tsconfig.json",
     "start": "node dist/server.js",
     "test": "vitest run --coverage",
-    "lint": "eslint src --max-warnings 0"
+    "lint": "eslint src --max-warnings 0",
+    "seed": "tsx scripts/seed.ts",
+    "migrate": "tsx -e \"import('./src/db/migrate.ts').then(m=>m.runMigrations())\""
   },
   "dependencies": {
+    "bcrypt": "5.1.1",
+    "better-sqlite3": "11.3.0",
     "cors": "^2.8.5",
     "dotenv": "^16.4.5",
     "express": "^4.21.0",
     "pino": "^9.4.0",
     "pino-http": "^10.3.0",
     "uuid": "^10.0.0",
     "zod": "^3.23.8"
   },
   "devDependencies": {
+    "@types/bcrypt": "^5.0.2",
+    "@types/better-sqlite3": "^7.6.11",
     "@types/cors": "^2.8.17",
     "@types/express": "^4.17.21",
     ...
   }
```

**Versions** are pinned exact for security-critical deps per patterns § 1.5 (bcrypt and better-sqlite3 are crypto + native-binding code).

### 2. `backend/src/server.ts` — wire migrations into boot

```diff
 import { buildApp } from './app';
 import { env } from './config/env';
 import { logger } from './logger';
+import { runMigrations } from './db/migrate';

+runMigrations();   // idempotent; runs on every boot so `npm run dev` always has up-to-date schema
 const app = buildApp();
 app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'server listening'));
```

### 3. `.env.example` (shared_file) — document new env vars used by `seed.ts`

If Story 1.1 has not already added these:
```diff
+SEED_ADMIN_EMAIL=admin@example.com
+SEED_ADMIN_PASSWORD=change-me-now-1234
+DB_FILE=./data/mvp-crm.db
+BCRYPT_COST=12
```
(Defaults already exist in the env schema per patterns § 6.1; `.env.example` is operator documentation.)

---

## Lessons Learned

1. **Parallel dispatch dependency-on-dependency**: this story declared `requires: []`, but Story 1.1's outputs (`backend/package.json`, `vitest.config.ts`, `tsconfig.json`, `logger.ts`, `config/env.ts`) are *implicit* runtime dependencies — my tests and code can't execute until 1.1 lands. The dependency graph captures sequence; it doesn't capture "execution-time required". The team should consider adding an `execution_requires` field separate from `requires`, or making explicit that wave-1 stories share an install step that the parent runs post-merge.

2. **`backend/package.json` is a coordination point**: pinning bcrypt/better-sqlite3 exact-version is a deliberate security-pattern choice (§ 1.5). The parent must NOT replace these with caret ranges during reconciliation.

3. **Test-DI design paid off immediately**: extracting `applyMigrations(conn, dir)` (pure DI) from `runMigrations()` (env-coupled) made all 5 migration tests trivial — no env stubbing, no module mocking, no global state. This is the SOLID Dependency Inversion pattern from the rulebook applied at the smallest useful scale.

4. **better-sqlite3 transactional semantics**: `conn.transaction(fn)` automatically rolls back on throw and re-raises. This makes the "failing migration leaves DB unchanged" requirement implementation-free — the test passes because of how the library works, not because of error-handling code in `migrate.ts`.

5. **Deferred test execution is honest reporting**: rather than fabricate a "0/0 passed" line, this story explicitly tells the parent what must be done post-merge. Per the rulebook ("Tests-green ≠ spec-met"), the DoD gates above can be verified by code review even before tests run.

---

## Deviations / Blockers

- **Deviation**: Story Test snippet referenced `./migrate-testkit` as an "injected helper". I named the exported helper `runMigrationsAt` directly on `migrate.ts` instead (matches the implementation note's directive to *"extract a small `runMigrationsAt(dbPath, dir)` helper in `migrate.ts`"*). No separate testkit module — keeps the public surface area smaller.
- **Blocker**: cannot run `npm test` / `npm lint` in this subagent invocation because (a) backend deps are not yet installed by Story 1.1, and (b) `bcrypt` + `better-sqlite3` are absent from `backend/package.json` and I'm not allowed to add them (shared_files contract). Deferred to parent per the dispatch prompt's explicit contingency clause.
