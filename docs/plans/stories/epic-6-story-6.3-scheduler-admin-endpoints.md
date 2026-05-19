### Story 6.3: Scheduler + Admin Endpoints + Digest CLI

**Epic**: 6 - WEEKLY EMAIL DIGEST | **ID**: 6.3 | **Date**: 2026-05-19 | **GitHub**: #22
**Requires**: [6.2]
**Enables**: []
**Files Touched**:
  - backend/package.json
  - backend/src/features/digest/digest.routes.ts
  - backend/src/features/digest/digest.scheduler.ts
  - backend/src/features/digest/digest.routes.int.test.ts
  - backend/scripts/digest-run.ts
  - backend/src/routes.ts
  - backend/src/app.ts
  - backend/src/server.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/requirements.md` — Feature: Weekly Monday Email Digest.
- `docs/architecture/design/00-system-architecture-greenfield.md` — § DR-3 (node-cron), § Component Architecture (Scheduler).
- Story 6.2 (`runWeeklyDigest`).

**Description**:
Closes Epic 6: wires the digest into the live system. Schedules `runWeeklyDigest` via `node-cron` using `env.DIGEST_CRON` (default `0 9 * * 1` — Mondays 09:00 server-local). Exposes admin-only HTTP endpoints `POST /api/admin/digest/run` (manual trigger; returns the summary) and `GET /api/admin/digest/runs` (last 30 history rows). Adds `npm run digest:run` CLI for local QA. Initializes the scheduler from `server.ts` (so it runs as part of the API process, per DR-3). Wraps the cron callback in `try/catch` at the scheduler boundary so a runtime exception cannot crash the API process.

**Acceptance Criteria**:
- `POST /api/admin/digest/run` (admin) → 200 `{runId, recipients, successes, failures}`; under the hood invokes `runWeeklyDigest({triggeredBy:'manual', mailer})`.
- Same endpoint for `sales` → 403.
- Unauthed → 401.
- `GET /api/admin/digest/runs` (admin) → 200 `DigestRun[]` (last 30).
- `npm --workspace backend run digest:run` invokes `runWeeklyDigest({triggeredBy:'manual'})` with the real Nodemailer mailer; logs the summary; exits 0 on success.
- On boot in `NODE_ENV=test` the scheduler is NOT started (so tests don't actually fire cron).
- In `development`/`production`, the scheduler is started; cron string is `env.DIGEST_CRON`; the callback wraps `runWeeklyDigest` in `try/catch` and logs unhandled exceptions at `error` (process survives).
- Schedule string is validated by `node-cron.validate`; if invalid, process exits at boot with a clear error.
- Integration tests with a fake mailer assert: manual trigger sends emails, history endpoint returns rows including the new one.

**Prerequisites**: 6.2 (service), 2.1 (`requireRole('admin')`), 6.1 (Mailer factory).

**Context**: `backend/src/server.ts`, `backend/src/app.ts`, `backend/src/test/factories.ts`, `backend/src/features/digest/*`.

**Patterns**: Cron-boundary try/catch (§ 2.4); inject mailer (§ 8.4); admin-only via `requireRole` (§ 5.4); never throw past the scheduler (DR-3).

**Steps**:

1. **Add deps** — `backend/package.json` (shared):
   ```json
   { "dependencies": { "node-cron": "^3.0.3" },
     "devDependencies": { "@types/node-cron": "^3.0.11" },
     "scripts": { "digest:run": "tsx scripts/digest-run.ts" } }
   ```

2. **Routes** — `backend/src/features/digest/digest.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { createNodemailerMailer } from './mailer';
   import { runWeeklyDigest } from './digest.service';
   import { digestRepository } from './digest.repository';
   import type { Mailer } from './digest.types';

   export function buildDigestRouter(opts: { mailer?: Mailer } = {}) {
     const router = Router();
     // Allow injection in tests; production uses the real Nodemailer transport.
     const mailerProvider = () => opts.mailer ?? createNodemailerMailer();

     router.post('/run', async (_req, res, next) => {
       try { res.json(await runWeeklyDigest({ triggeredBy: 'manual', mailer: mailerProvider() })); }
       catch (e) { next(e); }
     });

     router.get('/runs', (_req, res) => {
       res.json(digestRepository.listRecent(30));
     });

     return router;
   }
   ```

3. **Scheduler** — `backend/src/features/digest/digest.scheduler.ts`:
   ```ts
   import cron from 'node-cron';
   import { runWeeklyDigest } from './digest.service';
   import { createNodemailerMailer } from './mailer';
   import { env } from '@/config/env';
   import { logger } from '@/logger';

   export function startDigestScheduler() {
     if (env.NODE_ENV === 'test') return;
     if (!cron.validate(env.DIGEST_CRON)) {
       logger.error({ cron: env.DIGEST_CRON }, 'invalid DIGEST_CRON');
       process.exit(1);
     }
     cron.schedule(env.DIGEST_CRON, async () => {
       try {
         await runWeeklyDigest({ triggeredBy: 'cron', mailer: createNodemailerMailer() });
       } catch (err) {
         logger.error({ err }, 'digest scheduler error');
       }
     });
     logger.info({ cron: env.DIGEST_CRON }, 'digest scheduler started');
   }
   ```

4. **Mount router + admin gate** — patch `backend/src/app.ts` (shared):
   ```ts
   import { requireRole } from './http/middleware/requireRole';
   import { buildDigestRouter } from './features/digest/digest.routes';
   // Inside buildApp(), after authMiddleware mount and AFTER usersRouter mount:
   app.use('/api/admin/digest', authMiddleware, requireRole('admin'), buildDigestRouter());
   ```
   *Test override*: `buildApp({ digestMailer })` could pass a fake mailer through if the factory signature accepts an options bag. Keep simple: tests call `buildDigestRouter({ mailer: fake })` directly and mount on a fresh `express()` app.

5. **Start scheduler on boot** — patch `backend/src/server.ts` (shared):
   ```ts
   import { startDigestScheduler } from './features/digest/digest.scheduler';
   // After app.listen(...) callback runs:
   startDigestScheduler();
   ```

6. **CLI** — `backend/scripts/digest-run.ts`:
   ```ts
   import { runMigrations } from '../src/db/migrate';
   import { runWeeklyDigest } from '../src/features/digest/digest.service';
   import { createNodemailerMailer } from '../src/features/digest/mailer';
   import { logger } from '../src/logger';

   async function main() {
     runMigrations();
     const r = await runWeeklyDigest({ triggeredBy: 'manual', mailer: createNodemailerMailer() });
     logger.info(r, 'digest CLI complete');
     process.exit(0);
   }
   main().catch((err) => { logger.error({ err }, 'digest CLI failed'); process.exit(1); });
   ```

**Tests** — `backend/src/features/digest/digest.routes.int.test.ts`:

```ts
import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach } from 'vitest';
import { authMiddleware } from '@/http/middleware/auth';
import { requireRole } from '@/http/middleware/requireRole';
import { errorHandler } from '@/http/middleware/errorHandler';
import { resetDb, makeUser, tokenFor } from '@/test/factories';
import { leadsService } from '@/features/leads/leads.service';
import { buildDigestRouter } from './digest.routes';
import { createFakeMailer } from './mailer';

const lead = { opportunityName: 'Acme', contactPerson: 'Jane', estimatedClosingDate: '2026-12-01', leadValue: 100, notes: null };

function mkApp(mailer = createFakeMailer()) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/digest', authMiddleware, requireRole('admin'), buildDigestRouter({ mailer }));
  app.use(errorHandler);
  return { app, mailer };
}

describe('Digest admin routes', () => {
  beforeEach(resetDb);

  it('POST /run is forbidden for sales', async () => {
    const sales = await makeUser({ role: 'sales' });
    const { app } = mkApp();
    const r = await request(app).post('/api/admin/digest/run').set('Authorization', `Bearer ${tokenFor(sales)}`);
    expect(r.status).toBe(403);
  });

  it('POST /run requires auth', async () => {
    const { app } = mkApp();
    expect((await request(app).post('/api/admin/digest/run')).status).toBe(401);
  });

  it('POST /run as admin sends emails and returns summary', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser({ email: 'alice@ex.com' });
    leadsService.create(lead, alice);
    const { app, mailer } = mkApp();
    const r = await request(app).post('/api/admin/digest/run').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ recipients: 1, successes: 1, failures: 0 });
    expect(mailer.sent.map((s) => s.to)).toEqual(['alice@ex.com']);
  });

  it('GET /runs lists recent runs', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    leadsService.create(lead, alice);
    const { app } = mkApp();
    await request(app).post('/api/admin/digest/run').set('Authorization', `Bearer ${tokenFor(admin)}`);
    const r = await request(app).get('/api/admin/digest/runs').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(r.status).toBe(200);
    expect(r.body[0]).toMatchObject({ triggeredBy: 'manual', successCount: 1, failureCount: 0 });
  });
});
```

Manual tests:
- Configure Mailtrap creds in `.env`.
- Seed admin + create at least one sales user with an active lead.
- `npm --workspace backend run digest:run` → CLI logs `recipients/successes/failures`; Mailtrap inbox shows the email.
- Login as admin via UI/curl, `POST /api/admin/digest/run` → 200 summary.
- `GET /api/admin/digest/runs` → row visible.
- Temporarily set a bad SMTP password → digest run still completes; failure recorded in `digest_runs.notes`; process does NOT crash.
- Set `DIGEST_CRON` to `* * * * *` (every minute) in `.env` for a dev validation pass; observe a tick in logs.

**Quality**: ESLint 0; Vitest passes; coverage ≥85%; cron callback wrapped in try/catch (verified by code review checklist § 11).

**OUT**:
- ❌ External scheduler (BullMQ/Redis) — DR-3.
- ❌ Per-recipient retry on transient SMTP failures — out of scope.
- ❌ Distributed cron coordination (this scheduler is single-instance only) — out of scope for local-only MVP.
- ❌ Live config reload of `DIGEST_CRON` — requires process restart.
- ❌ HTML / template emails — out of scope.

**Evidence**: CLI run output, Mailtrap screenshot, `GET /admin/digest/runs` JSON, Vitest output.
