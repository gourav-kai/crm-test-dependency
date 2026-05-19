### Story 6.1: Mailer + Digest Repository

**Epic**: 6 - WEEKLY EMAIL DIGEST | **ID**: 6.1 | **Date**: 2026-05-19 | **GitHub**: #20
**Requires**: [1.3]
**Enables**: [6.2]
**Files Touched**:
  - backend/package.json
  - backend/src/features/digest/mailer.ts
  - backend/src/features/digest/digest.repository.ts
  - backend/src/features/digest/digest.types.ts
  - backend/src/features/digest/digest.repository.test.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Component Architecture (Mailer + Scheduler), § DR-3, § Observability.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 2.4 (digest exception for try/catch), § 4 (repo).
- `docs/requirements.md` — Feature: Weekly Monday Email Digest.

**Description**:
Two foundational pieces for the digest feature: (1) a `Mailer` interface + Nodemailer-backed implementation that wraps `transporter.sendMail()`, factory-injectable so tests can pass a fake; (2) a `digestRepository` that owns the `digest_runs` table (create, listRecent). No scheduling, no service orchestration here — those are Stories 6.2 and 6.3.

**Acceptance Criteria**:
- `Mailer` interface: `send({to, subject, text, html?}): Promise<void>`.
- `createNodemailerMailer(env)` returns a `Mailer` backed by `nodemailer.createTransport` using `SMTP_HOST/PORT/USER/PASS/FROM` from env.
- `createFakeMailer()` returns `{ send, sent: SentMessage[] }` — used by tests; appends to in-memory `sent` array.
- `digestRepository.create(run)`: inserts a `digest_runs` row with `run_at = now`, returns the new row id.
- `digestRepository.listRecent(limit=30)`: returns the last `N` runs ordered by `run_at DESC`.
- Both use prepared statements; no string-concat SQL.
- Tests use real in-memory SQLite + `createFakeMailer()`; never `vi.mock('nodemailer')` per patterns § 8.4.
- Coverage ≥85% on both files; ≥90% on the repository.

**Prerequisites**: 1.3 (`digest_runs` table).

**Context**: `backend/src/db/client.ts`, `backend/src/config/env.ts`.

**Patterns**: Inject fakes via factory (§ 8.4); repository owns SQL (§ 4.2); per-recipient try/catch is the exception, not catch-all (§ 2.4 — applied in 6.2).

**Steps**:

1. **Add deps** — `backend/package.json` (shared): `nodemailer ^6.9.15`, dev `@types/nodemailer ^6.4.16`.

2. **Types** — `backend/src/features/digest/digest.types.ts`:
   ```ts
   export interface SentMessage { to: string; subject: string; text: string; html?: string; }

   export interface Mailer {
     send(msg: SentMessage): Promise<void>;
   }

   export interface DigestRun {
     id: number;
     runAt: string;
     triggeredBy: 'cron' | 'manual';
     recipientsCount: number;
     successCount: number;
     failureCount: number;
     notes: string | null;
   }
   ```

3. **Mailer** — `backend/src/features/digest/mailer.ts`:
   ```ts
   import nodemailer from 'nodemailer';
   import type { Mailer, SentMessage } from './digest.types';
   import { env } from '@/config/env';

   export function createNodemailerMailer(): Mailer {
     const transporter = nodemailer.createTransport({
       host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
       auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
     });
     return {
       async send(msg) {
         await transporter.sendMail({ from: env.SMTP_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
       },
     };
   }

   export function createFakeMailer() {
     const sent: SentMessage[] = [];
     let fail: ((m: SentMessage) => boolean) | null = null;
     const mailer: Mailer & { sent: SentMessage[]; failOn(predicate: (m: SentMessage) => boolean): void } = {
       async send(msg) {
         if (fail?.(msg)) throw new Error(`Mail failed for ${msg.to}`);
         sent.push(msg);
       },
       sent,
       failOn(predicate) { fail = predicate; },
     };
     return mailer;
   }
   ```

4. **Repository** — `backend/src/features/digest/digest.repository.ts`:
   ```ts
   import { db } from '@/db/client';
   import type { DigestRun } from './digest.types';

   interface Row {
     id: number; run_at: string; triggered_by: 'cron'|'manual';
     recipients_count: number; success_count: number; failure_count: number; notes: string | null;
   }
   const rowToRun = (r: Row): DigestRun => ({
     id: r.id, runAt: r.run_at, triggeredBy: r.triggered_by,
     recipientsCount: r.recipients_count, successCount: r.success_count,
     failureCount: r.failure_count, notes: r.notes,
   });

   const insertStmt = db.prepare(`INSERT INTO digest_runs (run_at, triggered_by, recipients_count, success_count, failure_count, notes)
                                  VALUES (@run_at, @triggered_by, @recipients_count, @success_count, @failure_count, @notes)`);
   const listStmt   = db.prepare('SELECT * FROM digest_runs ORDER BY run_at DESC LIMIT ?');

   export const digestRepository = {
     create(input: {
       triggeredBy: 'cron' | 'manual';
       recipientsCount: number;
       successCount: number;
       failureCount: number;
       notes: string | null;
     }): DigestRun {
       const run_at = new Date().toISOString();
       const info = insertStmt.run({
         run_at,
         triggered_by: input.triggeredBy,
         recipients_count: input.recipientsCount,
         success_count: input.successCount,
         failure_count: input.failureCount,
         notes: input.notes,
       });
       return {
         id: Number(info.lastInsertRowid),
         runAt: run_at, triggeredBy: input.triggeredBy,
         recipientsCount: input.recipientsCount,
         successCount: input.successCount, failureCount: input.failureCount,
         notes: input.notes,
       };
     },

     listRecent(limit = 30): DigestRun[] {
       return (listStmt.all(limit) as Row[]).map(rowToRun);
     },
   };
   ```

**Tests** — `backend/src/features/digest/digest.repository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/test/factories';
import { digestRepository } from './digest.repository';
import { createFakeMailer } from './mailer';

describe('digestRepository', () => {
  beforeEach(resetDb);

  it('creates a row and returns it', () => {
    const r = digestRepository.create({
      triggeredBy: 'manual', recipientsCount: 2, successCount: 2, failureCount: 0, notes: null,
    });
    expect(r.id).toBeGreaterThan(0);
    expect(r.runAt).toMatch(/T/);
  });

  it('listRecent orders by run_at DESC and respects limit', async () => {
    digestRepository.create({ triggeredBy: 'cron', recipientsCount: 1, successCount: 1, failureCount: 0, notes: null });
    await new Promise((r) => setTimeout(r, 10));
    const second = digestRepository.create({ triggeredBy: 'manual', recipientsCount: 1, successCount: 1, failureCount: 0, notes: 'x' });
    const list = digestRepository.listRecent(10);
    expect(list[0].id).toBe(second.id);
  });
});

describe('createFakeMailer', () => {
  it('captures sent messages and honours failOn', async () => {
    const m = createFakeMailer();
    await m.send({ to: 'a@x', subject: 's', text: 't' });
    m.failOn((msg) => msg.to === 'fail@x');
    await expect(m.send({ to: 'fail@x', subject: 's', text: 't' })).rejects.toThrow();
    await m.send({ to: 'b@x', subject: 's', text: 't' });
    expect(m.sent.map((s) => s.to)).toEqual(['a@x', 'b@x']);
  });
});
```

Manual tests: deferred to Story 6.2 + 6.3 (no public entrypoint yet).

**Quality**: ESLint 0; Vitest passes; coverage ≥90% on repo; no use of `vi.mock('nodemailer')`.

**OUT**:
- ❌ Service orchestration / per-recipient try/catch — Story 6.2.
- ❌ Scheduler / cron — Story 6.3.
- ❌ Manual trigger HTTP endpoint — Story 6.3.
- ❌ HTML template engine (Handlebars/MJML) — out of scope; plain text is the MVP.
- ❌ Attachments — out of scope.

**Evidence**: Vitest output with timing + coverage delta.
