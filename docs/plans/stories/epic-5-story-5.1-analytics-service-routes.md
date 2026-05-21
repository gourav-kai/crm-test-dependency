### Story 5.1: Analytics Service + Routes (leads-per-person, leads-by-stage)

**Epic**: 5 - ANALYTICS DASHBOARD | **ID**: 5.1 | **Date**: 2026-05-19 | **GitHub**: #18
**Requires**: [4.1]
**Enables**: [5.2]
**Files Touched**:
  - backend/src/features/analytics/analytics.service.ts
  - backend/src/features/analytics/analytics.routes.ts
  - backend/src/features/analytics/analytics.schemas.ts
  - backend/src/features/analytics/analytics.service.test.ts
  - backend/src/features/analytics/analytics.routes.int.test.ts
  - backend/src/routes.ts
  - backend/src/app.ts
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § API Design (Analytics), § Component Architecture.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 4 (DB Access), § 5 (API).
- Story 4.1 (`countByOwner`, `countByStage`).

**Description**:
Backend for the dashboard: two read-only endpoints that return role-scoped aggregations. `GET /api/analytics/leads-per-person` returns `[{ownerId, ownerName, count}]` (admin: all active salespeople; sales: own row only). `GET /api/analytics/leads-by-stage` returns 4 rows in fixed enum order (admin: org-wide; sales: scoped to self). Service applies the role scope by calling the repository overloads from Story 4.1.

**Acceptance Criteria**:
- `GET /api/analytics/leads-per-person` (admin) → 200 array of all `{ownerId, ownerName, count}` for active sales users (including zero-count rows).
- `GET /api/analytics/leads-per-person` (sales) → 200 array with exactly one row matching `user.id`.
- `GET /api/analytics/leads-by-stage` (admin) → 200 4-row array, fixed order `Evaluating → Proposing → Solutioning → Complete`, counts are org-wide.
- `GET /api/analytics/leads-by-stage` (sales) → 200 4-row array, counts scoped to `owner_id = user.id`.
- All endpoints require JWT (401 without).
- Schemas validate query params are empty (no filters in MVP).
- Repository aggregations are reused; no new SQL in service.
- Integration tests cover admin + 2 reps fixture asserting visibility rules.
- Coverage ≥85% on service + routes.

**Prerequisites**: 4.1 (repository aggregations), 2.1 (auth middleware).

**Context**: `backend/src/features/leads/leads.repository.ts`, `backend/src/test/factories.ts`.

**Patterns**: Service applies scope (§ Security); routes parse + delegate (§ 5.1); zero-fill missing rows handled in repo (§ 4.2 — done in 4.1).

**Steps**:

1. **Schemas (minimal)** — `backend/src/features/analytics/analytics.schemas.ts`:
   ```ts
   import { z } from 'zod';
   export const AnalyticsQuerySchema = z.object({}).strict(); // no filters for MVP
   ```

2. **Service** — `backend/src/features/analytics/analytics.service.ts`:
   ```ts
   import { leadsRepository } from '@/features/leads/leads.repository';
   import type { AuthedUser } from '@/features/leads/leads.service';

   export const analyticsService = {
     leadsPerPerson(user: AuthedUser) {
       return user.role === 'admin'
         ? leadsRepository.countByOwner()
         : leadsRepository.countByOwner(user.id);
     },
     leadsByStage(user: AuthedUser) {
       return user.role === 'admin'
         ? leadsRepository.countByStage()
         : leadsRepository.countByStage(user.id);
     },
   };
   ```

3. **Routes** — `backend/src/features/analytics/analytics.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { AnalyticsQuerySchema } from './analytics.schemas';
   import { analyticsService } from './analytics.service';

   export const analyticsRouter = Router();

   analyticsRouter.get('/leads-per-person', (req, res, next) => {
     try { AnalyticsQuerySchema.parse(req.query); res.json(analyticsService.leadsPerPerson(req.user!)); } catch (e) { next(e); }
   });

   analyticsRouter.get('/leads-by-stage', (req, res, next) => {
     try { AnalyticsQuerySchema.parse(req.query); res.json(analyticsService.leadsByStage(req.user!)); } catch (e) { next(e); }
   });
   ```

4. **Wire** — patch `routes.ts`:
   ```ts
   import { analyticsRouter } from './features/analytics/analytics.routes';
   apiRouter.use('/analytics', analyticsRouter);
   ```

**Tests** — `backend/src/features/analytics/analytics.service.test.ts` + `analytics.routes.int.test.ts`:

```ts
// analytics.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser } from '@/test/factories';
import { analyticsService } from './analytics.service';
import { leadsService } from '@/features/leads/leads.service';

const lead = { opportunityName: 'Acme', contactPerson: 'Jane', estimatedClosingDate: '2026-12-01', leadValue: 100, notes: null };

describe('analyticsService', () => {
  beforeEach(resetDb);

  it('leadsPerPerson — admin sees all active sales', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    const bob   = await makeUser();
    leadsService.create(lead, alice); leadsService.create(lead, alice);
    leadsService.create(lead, bob);
    const r = analyticsService.leadsPerPerson(admin);
    expect(r).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerId: alice.id, count: 2 }),
      expect.objectContaining({ ownerId: bob.id, count: 1 }),
    ]));
  });

  it('leadsPerPerson — sales sees only own row', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    leadsService.create(lead, alice); leadsService.create(lead, bob);
    const r = analyticsService.leadsPerPerson(alice);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ ownerId: alice.id, count: 1 });
  });

  it('leadsByStage — admin org-wide, 4 stages always', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    leadsService.create(lead, alice);
    const r = analyticsService.leadsByStage(admin);
    expect(r.map((x) => x.stage)).toEqual(['Evaluating','Proposing','Solutioning','Complete']);
    expect(r.find((x) => x.stage === 'Evaluating')!.count).toBe(1);
    expect(r.find((x) => x.stage === 'Complete')!.count).toBe(0);
  });

  it('leadsByStage — sales scoped to self', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    leadsService.create(lead, bob);
    const r = analyticsService.leadsByStage(alice);
    expect(r.find((x) => x.stage === 'Evaluating')!.count).toBe(0);
  });
});
```

```ts
// analytics.routes.int.test.ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '@/app';
import { resetDb, makeUser, tokenFor } from '@/test/factories';

describe('Analytics routes', () => {
  const app = buildApp();
  beforeEach(resetDb);

  it('401 without token', async () => {
    expect((await request(app).get('/api/analytics/leads-per-person')).status).toBe(401);
  });

  it('admin sees all reps', async () => {
    const admin = await makeUser({ role: 'admin' });
    await makeUser({ email: 'a@ex.com' });
    await makeUser({ email: 'b@ex.com' });
    const r = await request(app).get('/api/analytics/leads-per-person').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(2);
  });

  it('sales sees only self in leads-per-person', async () => {
    const alice = await makeUser();
    const r = await request(app).get('/api/analytics/leads-per-person').set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].ownerId).toBe(alice.id);
  });

  it('leads-by-stage always returns 4 rows in fixed order', async () => {
    const alice = await makeUser();
    const r = await request(app).get('/api/analytics/leads-by-stage').set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(r.body.map((x: any) => x.stage)).toEqual(['Evaluating','Proposing','Solutioning','Complete']);
  });
});
```

Manual tests:
- Login as Admin, create 3 leads for Alice and 1 for Bob → `GET /api/analytics/leads-per-person` shows 2+ rows with counts.
- Login as Alice → same endpoint shows 1 row.
- `GET /api/analytics/leads-by-stage` (admin) → 4 rows; counts match leads.

**Quality**: ESLint 0; coverage ≥85%; no new SQL outside repository.

**OUT**:
- ❌ Frontend dashboard — Story 5.2.
- ❌ Date range / time-series — out of scope.
- ❌ Per-stage value sum (revenue forecast) — explicit OUT (pipeline forecasting is "future considerations").
- ❌ Pre-aggregated/cached views — out of scope (live query per request).
- ❌ Drilldown filters — out of scope.

**Evidence**: Vitest output for both test files; curl transcript of admin vs sales.
