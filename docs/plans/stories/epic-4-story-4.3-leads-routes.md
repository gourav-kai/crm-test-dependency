### Story 4.3: Leads Routes (CRUD + Stage Transition)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.3 | **Date**: 2026-05-19 | **GitHub**: #14
**Requires**: [4.2]
**Enables**: [4.4]
**Files Touched**:
  - backend/src/features/leads/leads.routes.ts
  - backend/src/features/leads/leads.schemas.ts
  - backend/src/features/leads/leads.routes.int.test.ts
  - backend/src/routes.ts
  - backend/src/app.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § API Design (Leads).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 5 (API).
- Story 4.2 (service contracts).

**Description**:
Exposes the leads CRUD + stage transition via HTTP. All endpoints require auth (handled by global `authMiddleware` from 2.1). Zod schemas at the route boundary; routes delegate to the service. Integration tests with two-rep fixture verify FC-1 (no cross-rep data leak) at the HTTP boundary as well as the service unit tests.

**Acceptance Criteria**:
- `GET /api/leads?stage=&search=` → 200 `Lead[]` scoped by role; stage validated as enum (422 if junk).
- `POST /api/leads` → 201 `Lead`; body parsed via `LeadCreateSchema`; `owner_id` set to authed user.
- `GET /api/leads/:id` → 200 `Lead` if owner or admin; 404 otherwise.
- `PATCH /api/leads/:id` → 200 updated `Lead`; partial body via `LeadUpdateSchema`; empty body → 422.
- `DELETE /api/leads/:id` → 200 `{ok:true}`; cross-rep → 404.
- `POST /api/leads/:id/stage` → 200 updated `Lead`; body `{ stage }` validated; invalid → 422 with `INVALID_STAGE`.
- All non-200 responses use the standard `{error:{code,message,details?}}` envelope.
- Integration tests cover happy paths + every documented error response code (401, 404, 422).
- Integration tests prove cross-rep returns 404 (not 403) on `GET`, `PATCH`, `DELETE`, `/stage`.
- Coverage ≥85% on routes file.

**Prerequisites**: 4.2 (service), 2.1 (auth middleware).

**Context**: `backend/src/features/leads/leads.service.ts`, `backend/src/test/factories.ts`.

**Patterns**: Route parses + delegates (§ 5.1, 5.6); Zod strict on bodies (§ 5.2); central registry (§ 5.4).

**Steps**:

1. **Schemas** — `backend/src/features/leads/leads.schemas.ts`:
   ```ts
   import { z } from 'zod';
   import { STAGES } from './leads.types';

   export const LeadStageSchema = z.enum(STAGES);

   export const LeadCreateSchema = z.object({
     opportunityName: z.string().min(1).max(200),
     contactPerson: z.string().min(1).max(200),
     estimatedClosingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
     leadValue: z.number().nonnegative(),
     notes: z.string().max(5000).optional().nullable(),
   }).strict();

   export const LeadUpdateSchema = LeadCreateSchema.partial().strict()
     .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

   export const StageTransitionSchema = z.object({ stage: LeadStageSchema }).strict();

   export const ListLeadsQuerySchema = z.object({
     stage: LeadStageSchema.optional(),
     search: z.string().max(200).optional(),
   }).strict();
   ```

2. **Routes** — `backend/src/features/leads/leads.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { leadsService } from './leads.service';
   import {
     LeadCreateSchema, LeadUpdateSchema, StageTransitionSchema, ListLeadsQuerySchema,
   } from './leads.schemas';

   export const leadsRouter = Router();

   leadsRouter.get('/', (req, res, next) => {
     try {
       const q = ListLeadsQuerySchema.parse(req.query);
       res.json(leadsService.list(req.user!, q));
     } catch (e) { next(e); }
   });

   leadsRouter.post('/', (req, res, next) => {
     try {
       const input = LeadCreateSchema.parse(req.body);
       res.status(201).json(leadsService.create(input, req.user!));
     } catch (e) { next(e); }
   });

   leadsRouter.get('/:id(\\d+)', (req, res, next) => {
     try { res.json(leadsService.getById(Number(req.params.id), req.user!)); } catch (e) { next(e); }
   });

   leadsRouter.patch('/:id(\\d+)', (req, res, next) => {
     try {
       const patch = LeadUpdateSchema.parse(req.body);
       res.json(leadsService.update(Number(req.params.id), patch, req.user!));
     } catch (e) { next(e); }
   });

   leadsRouter.delete('/:id(\\d+)', (req, res, next) => {
     try { res.json(leadsService.delete(Number(req.params.id), req.user!)); } catch (e) { next(e); }
   });

   leadsRouter.post('/:id(\\d+)/stage', (req, res, next) => {
     try {
       const { stage } = StageTransitionSchema.parse(req.body);
       res.json(leadsService.updateStage(Number(req.params.id), stage, req.user!));
     } catch (e) { next(e); }
   });
   ```

3. **Patch routes.ts + app.ts** (shared):
   ```ts
   // routes.ts
   import { leadsRouter } from './features/leads/leads.routes';
   apiRouter.use('/leads', leadsRouter);
   ```
   `app.ts` already mounts `apiRouter` after `authMiddleware`; nothing else to change here.

**Tests** — `backend/src/features/leads/leads.routes.int.test.ts`:

```ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '@/app';
import { resetDb, makeUser, tokenFor } from '@/test/factories';

const body = {
  opportunityName: 'Acme', contactPerson: 'Jane Doe',
  estimatedClosingDate: '2026-12-01', leadValue: 5000,
};

describe('Leads routes', () => {
  const app = buildApp();
  beforeEach(resetDb);

  it('POST 401 without token', async () => {
    const r = await request(app).post('/api/leads').send(body);
    expect(r.status).toBe(401);
  });

  it('POST creates a lead owned by authed user', async () => {
    const alice = await makeUser();
    const r = await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ownerId: alice.id, stage: 'Evaluating' });
  });

  it('POST 422 on negative leadValue', async () => {
    const alice = await makeUser();
    const r = await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`)
      .send({ ...body, leadValue: -1 });
    expect(r.status).toBe(422);
  });

  it('GET / scoped by rep', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body);
    await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(bob)}`).send(body);
    const a = await request(app).get('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(a.body).toHaveLength(1);
  });

  it('GET ?search= matches case-insensitive substring', async () => {
    const alice = await makeUser();
    await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send({ ...body, opportunityName: 'Acme Corp' });
    await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send({ ...body, opportunityName: 'Globex' });
    const r = await request(app).get('/api/leads?search=acm').set('Authorization', `Bearer ${tokenFor(alice)}`);
    expect(r.body.map((l: any) => l.opportunityName)).toEqual(['Acme Corp']);
  });

  it('cross-rep GET /:id returns 404 (not 403)', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    const created = (await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body)).body;
    const r = await request(app).get(`/api/leads/${created.id}`).set('Authorization', `Bearer ${tokenFor(bob)}`);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });

  it('admin GET /:id returns rep\'s lead', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    const created = (await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body)).body;
    const r = await request(app).get(`/api/leads/${created.id}`).set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(r.status).toBe(200);
  });

  it('POST /:id/stage → 200 happy', async () => {
    const alice = await makeUser();
    const c = (await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body)).body;
    const r = await request(app).post(`/api/leads/${c.id}/stage`).set('Authorization', `Bearer ${tokenFor(alice)}`).send({ stage: 'Proposing' });
    expect(r.status).toBe(200);
    expect(r.body.stage).toBe('Proposing');
  });

  it('POST /:id/stage 422 on bad enum', async () => {
    const alice = await makeUser();
    const c = (await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body)).body;
    const r = await request(app).post(`/api/leads/${c.id}/stage`).set('Authorization', `Bearer ${tokenFor(alice)}`).send({ stage: 'Closed' });
    expect(r.status).toBe(422);
  });

  it('DELETE 404 cross-rep, 200 owner', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    const c = (await request(app).post('/api/leads').set('Authorization', `Bearer ${tokenFor(alice)}`).send(body)).body;
    expect((await request(app).delete(`/api/leads/${c.id}`).set('Authorization', `Bearer ${tokenFor(bob)}`)).status).toBe(404);
    expect((await request(app).delete(`/api/leads/${c.id}`).set('Authorization', `Bearer ${tokenFor(alice)}`)).status).toBe(200);
  });
});
```

Manual tests:
- Login as Admin; `POST /api/leads -d '{...}'` → 201. `GET /api/leads` → array including it.
- Login as Alice (sales); same `POST` → 201 with `ownerId: alice.id`.
- `GET /api/leads/<alice's id>` as Bob (other sales) → 404 with NOT_FOUND.
- `GET /api/leads/<alice's id>` as Admin → 200.
- `POST .../stage -d '{"stage":"Proposing"}'` → 200.
- `POST .../stage -d '{"stage":"foo"}'` → 422.

**Quality**: ESLint 0; Vitest passes; coverage ≥85%; no SQL in routes.

**OUT**:
- ❌ Frontend pages — Stories 4.4–4.6.
- ❌ Admin filter "by owner" in the list query — out of scope (admin sees all; client can filter).
- ❌ Sorting other than `updated_at DESC` — out of scope.
- ❌ Pagination — out of scope.
- ❌ Bulk operations — out of scope.

**Evidence**: Vitest output; transcript of cross-rep 404 + admin 200.
