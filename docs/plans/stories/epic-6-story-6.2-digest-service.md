### Story 6.2: Digest Service (runWeeklyDigest, per-recipient try/catch)

**Epic**: 6 - WEEKLY EMAIL DIGEST | **ID**: 6.2 | **Date**: 2026-05-19 | **GitHub**: #21
**Requires**: [3.1, 4.1, 6.1]
**Enables**: [6.3]
**Files Touched**:
  - backend/src/features/digest/digest.service.ts
  - backend/src/features/digest/digest.service.test.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/requirements.md` — Feature: Weekly Monday Email Digest (acceptance criteria).
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Compliance / SC-7, § Error Handling (digest is the per-recipient try/catch exception).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 2.4.

**Description**:
Orchestrates the weekly digest run. For each **active Salesperson** with **≥1 non-Complete lead**: builds an email (subject `Your active leads — week of YYYY-MM-DD`) listing each active lead's opportunity name, stage, est. close date, lead value, and last-updated timestamp. Sends via the injected `Mailer`. Per-recipient `try/catch` so one SMTP failure does not abort the run; failures are aggregated into `digest_runs.notes` (JSON array). Writes one `digest_runs` row with aggregate counts. Returns a `DigestRunSummary`. Pure orchestration — no HTTP, no cron, no DB access outside repositories.

**Acceptance Criteria**:
- `runWeeklyDigest({triggeredBy, mailer, now?}): Promise<DigestRunSummary>` is the only exported function from `digest.service.ts`.
- `triggeredBy` is `'cron'|'manual'` (passes through to `digest_runs`).
- `now` is optional ISO date for subject formatting; defaults to current date.
- Recipients = `usersRepository.listActiveSales()` filtered to those with `leadsRepository.listForUser({ user: { id, role:'sales' } })` containing ≥1 lead where `stage !== 'Complete'`.
- For each recipient, send one email. If `mailer.send` throws, increment `failureCount` and push `{ recipientId, error: <message> }` to a failures array — do NOT throw.
- After loop, `digestRepository.create({ triggeredBy, recipientsCount, successCount, failureCount, notes: JSON.stringify(failures) || null })`.
- Returns `{ runId, recipients, successes, failures }`.
- Email subject: `Your active leads — week of YYYY-MM-DD` where date is the ISO date of `now`.
- Email body (text): heading, then a bullet line per active lead:
  `- {opportunityName} | {stage} | due {estimatedClosingDate} | ${leadValue} | updated {updatedAt}`.
- `Complete` leads are excluded from the recipient's listing AND from the count that determines whether to send.
- Inactive salespeople are never recipients.
- Each per-recipient failure logs at `error` level with `{ recipientId, err }` — log line is checked by test.
- Coverage ≥90% on the service.

**Prerequisites**: 6.1 (mailer + repo), 3.1 (`usersRepository.listActiveSales`), 4.1 (`leadsRepository.listForUser` per user).

**Context**: `backend/src/features/users/users.repository.ts`, `backend/src/features/leads/leads.repository.ts`, `backend/src/features/digest/*`.

**Patterns**: Per-recipient try/catch — explicit § 2.4 exception; injected mailer (§ 8.4); never call `db` directly from service (§ 4.5).

**Steps**:

1. **Service** — `backend/src/features/digest/digest.service.ts`:
   ```ts
   import { usersRepository } from '@/features/users/users.repository';
   import { leadsRepository } from '@/features/leads/leads.repository';
   import { digestRepository } from './digest.repository';
   import type { Mailer } from './digest.types';
   import { logger } from '@/logger';

   const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

   export interface DigestRunSummary {
     runId: number;
     recipients: number;
     successes: number;
     failures: number;
   }

   /**
    * Sends the weekly digest to each active Salesperson with ≥1 non-Complete lead.
    * Per-recipient failures are recorded in digest_runs.notes and do NOT abort the run.
    */
   export async function runWeeklyDigest(opts: {
     triggeredBy: 'cron' | 'manual';
     mailer: Mailer;
     now?: Date;
   }): Promise<DigestRunSummary> {
     const now = opts.now ?? new Date();
     const weekOf = now.toISOString().slice(0, 10);
     const subject = `Your active leads — week of ${weekOf}`;

     const sales = usersRepository.listActiveSales();
     let successes = 0; let failures = 0;
     const failureNotes: Array<{ recipientId: number; error: string }> = [];
     let recipients = 0;

     for (const u of sales) {
       const allLeads = leadsRepository.listForUser({ user: { id: u.id, role: 'sales' } });
       const active = allLeads.filter((l) => l.stage !== 'Complete');
       if (active.length === 0) continue;
       recipients++;
       const lines = active.map((l) =>
         `- ${l.opportunityName} | ${l.stage} | due ${l.estimatedClosingDate} | ${fmtMoney(l.leadValue)} | updated ${l.updatedAt}`,
       );
       const text = `Hi ${u.fullName},\n\nYour active leads:\n\n${lines.join('\n')}\n\n— Mvp-CRM`;
       try {
         await opts.mailer.send({ to: u.email, subject, text });
         successes++;
       } catch (err) {
         failures++;
         failureNotes.push({ recipientId: u.id, error: String((err as Error).message ?? err) });
         logger.error({ err, recipientId: u.id }, 'digest send failed');
       }
     }

     const run = digestRepository.create({
       triggeredBy: opts.triggeredBy,
       recipientsCount: recipients,
       successCount: successes,
       failureCount: failures,
       notes: failureNotes.length ? JSON.stringify(failureNotes) : null,
     });

     logger.info({ runId: run.id, recipients, successes, failures, triggeredBy: opts.triggeredBy }, 'digest run complete');
     return { runId: run.id, recipients, successes, failures };
   }
   ```

**Tests** — `backend/src/features/digest/digest.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser } from '@/test/factories';
import { runWeeklyDigest } from './digest.service';
import { createFakeMailer } from './mailer';
import { leadsService } from '@/features/leads/leads.service';
import { digestRepository } from './digest.repository';

const lead = { opportunityName: 'Acme', contactPerson: 'Jane', estimatedClosingDate: '2026-12-01', leadValue: 5000, notes: null };

describe('runWeeklyDigest', () => {
  beforeEach(resetDb);

  it('sends one email per active sales user with ≥1 non-Complete lead', async () => {
    const alice = await makeUser({ email: 'alice@ex.com' });
    const bob   = await makeUser({ email: 'bob@ex.com' });
    await makeUser({ email: 'charlie@ex.com', active: false }); // skipped (inactive)
    leadsService.create(lead, alice);
    const bl = leadsService.create(lead, bob);
    leadsService.updateStage(bl.id, 'Complete', bob); // bob has only a Complete → no email
    const mailer = createFakeMailer();
    const r = await runWeeklyDigest({ triggeredBy: 'manual', mailer });
    expect(r.recipients).toBe(1);
    expect(r.successes).toBe(1);
    expect(r.failures).toBe(0);
    expect(mailer.sent.map((s) => s.to)).toEqual(['alice@ex.com']);
  });

  it('skips users with zero leads', async () => {
    await makeUser();
    const mailer = createFakeMailer();
    const r = await runWeeklyDigest({ triggeredBy: 'cron', mailer });
    expect(r.recipients).toBe(0);
    expect(mailer.sent).toHaveLength(0);
  });

  it('continues on per-recipient failure and records it in digest_runs.notes', async () => {
    const alice = await makeUser({ email: 'alice@ex.com' });
    const bob   = await makeUser({ email: 'bob@ex.com' });
    leadsService.create(lead, alice);
    leadsService.create(lead, bob);
    const mailer = createFakeMailer();
    mailer.failOn((m) => m.to === 'bob@ex.com');
    const r = await runWeeklyDigest({ triggeredBy: 'manual', mailer });
    expect(r.recipients).toBe(2);
    expect(r.successes).toBe(1);
    expect(r.failures).toBe(1);
    expect(mailer.sent.map((s) => s.to)).toEqual(['alice@ex.com']);
    const runs = digestRepository.listRecent(1);
    expect(runs[0].notes).toMatch(/bob@ex.com|"recipientId":/);
  });

  it('subject contains the ISO date of `now`', async () => {
    const alice = await makeUser();
    leadsService.create(lead, alice);
    const mailer = createFakeMailer();
    await runWeeklyDigest({ triggeredBy: 'manual', mailer, now: new Date('2026-05-25T09:00:00Z') });
    expect(mailer.sent[0].subject).toBe('Your active leads — week of 2026-05-25');
  });

  it('body lists each active lead with money formatting', async () => {
    const alice = await makeUser();
    leadsService.create({ ...lead, opportunityName: 'Acme', leadValue: 12345.6 }, alice);
    const mailer = createFakeMailer();
    await runWeeklyDigest({ triggeredBy: 'manual', mailer });
    expect(mailer.sent[0].text).toContain('Acme | Evaluating');
    expect(mailer.sent[0].text).toContain('$12,345.60');
  });
});
```

Manual tests: deferred to Story 6.3 (HTTP trigger + CLI).

**Quality**: ESLint 0; coverage ≥90% on service; service contains no SQL.

**OUT**:
- ❌ Cron scheduler — Story 6.3.
- ❌ HTTP endpoints — Story 6.3.
- ❌ HTML email body — out of scope; plain text only.
- ❌ Per-user time zone — server-local only (acknowledged risk, see DR-3).
- ❌ Retries on transient SMTP failures — out of scope; single attempt per recipient.

**Evidence**: Vitest output with all 5 cases green; sample log line from a run.
