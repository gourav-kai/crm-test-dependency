### Story 3.2: Users Routes (GET/POST/PATCH /users, admin-only)

**Epic**: 3 - USER MANAGEMENT | **ID**: 3.2 | **Date**: 2026-05-19 | **GitHub**: #10
**Requires**: [3.1]
**Enables**: [3.3]
**Files Touched**:
  - backend/src/features/users/users.routes.ts
  - backend/src/features/users/users.routes.int.test.ts
  - backend/src/routes.ts
  - backend/src/app.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § API Design (Users).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 5 (API Design), § 8.5 (integration tests).
- Story 3.1 (service + schemas), Story 2.1 (`requireRole`).

**Description**:
Wires the user-management HTTP endpoints onto `/api/users`, gated by `requireRole('admin')`. Endpoints: `GET /` (list all users), `POST /` (create), `PATCH /:id` (update). All routes return the API contract from `docs/architecture/design/00-system-architecture-greenfield.md`. Integration tests cover happy paths, role-isolation (Salesperson → 403), validation errors (422), and conflict (409 EMAIL_EXISTS).

**Acceptance Criteria**:
- `GET /api/users` (admin) → `200 User[]` ordered by `created_at`.
- `GET /api/users` (sales) → `403 { error: { code: 'FORBIDDEN' } }`.
- `GET /api/users` (no token) → `401`.
- `POST /api/users` (admin) with valid body → `201 User`.
- `POST /api/users` duplicate email → `409 { code: 'CONFLICT', message: 'Email already exists' }`.
- `POST /api/users` missing `password` → `422 { code: 'VALIDATION_ERROR', details: {...} }`.
- `POST /api/users` password <12 chars → 422.
- `POST /api/users` (sales) → 403.
- `PATCH /api/users/:id` (admin) with partial → `200 User` updated.
- `PATCH /api/users/:id` non-existent → `404 { code: 'NOT_FOUND' }`.
- `PATCH /api/users/:id` empty body → 422.
- All responses use camelCase keys (`fullName`, not `full_name`).
- Route registered in `routes.ts`; mounted with `requireRole('admin')` in `app.ts`.
- Integration tests use real in-memory DB via `resetDb`+`makeUser`+`tokenFor`; ≥85% coverage on routes file.

**Prerequisites**: 3.1 (service), 2.1 (requireRole + signToken via factories).

**Context**: `backend/src/features/users/users.service.ts`, `backend/src/test/factories.ts`.

**Patterns**: Routes parse + delegate (§ 5.1, 5.6); Zod throws → 422 envelope (§ 2.2); central route registry (§ 5.4).

**Steps**:

1. **Routes** — `backend/src/features/users/users.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { usersService } from './users.service';
   import { UserCreateSchema, UserPatchSchema } from './users.schemas';

   export const usersRouter = Router();

   usersRouter.get('/', (_req, res) => {
     res.json(usersService.list());
   });

   usersRouter.post('/', async (req, res, next) => {
     try {
       const input = UserCreateSchema.parse(req.body);
       const u = await usersService.create(input);
       res.status(201).json(u);
     } catch (e) { next(e); }
   });

   usersRouter.patch('/:id(\\d+)', (req, res, next) => {
     try {
       const input = UserPatchSchema.parse(req.body);
       res.json(usersService.patch(Number(req.params.id), input));
     } catch (e) { next(e); }
   });
   ```

2. **Patch `routes.ts`** (shared):
   ```ts
   import { usersRouter } from './features/users/users.routes';
   // ...
   apiRouter.use('/users', usersRouter);
   ```

3. **Patch `app.ts`** (shared) — apply `requireRole('admin')` at mount:
   ```ts
   import { requireRole } from './http/middleware/requireRole';
   // After authMiddleware mount, BEFORE the broad apiRouter mount:
   app.use('/api/users', requireRole('admin'));
   ```
   *Note*: the order is `authRouter` (public) → `authMiddleware` (for everything below) → `/api/users` `requireRole('admin')` → `apiRouter` (mounts `users` again is a no-op since first matching middleware wins — actually we mount the role gate as middleware on the SAME path, ensuring `requireRole('admin')` runs before the router handler. To be safe, prefer mounting `usersRouter` directly here instead of in `routes.ts`:

   Alternative (cleaner) approach:
   ```ts
   import { usersRouter } from './features/users/users.routes';
   app.use('/api/users', authMiddleware, requireRole('admin'), usersRouter);
   ```
   Then DO NOT register `users` in `routes.ts`. Pick this approach; it makes the role gate explicit at the wiring layer.

**Tests** — `backend/src/features/users/users.routes.int.test.ts`:

```ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '@/app';
import { resetDb, makeUser, tokenFor } from '@/test/factories';

describe('Users routes (admin only)', () => {
  const app = buildApp();
  beforeEach(resetDb);

  it('GET / returns all users for admin', async () => {
    const admin = await makeUser({ role: 'admin' });
    await makeUser({ email: 'a@ex.com' });
    await makeUser({ email: 'b@ex.com' });
    const r = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(3);
    expect(r.body[0]).toHaveProperty('fullName');
    expect(r.body[0]).not.toHaveProperty('password_hash');
  });

  it('GET / is forbidden for sales', async () => {
    const sales = await makeUser({ role: 'sales' });
    const r = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(sales)}`);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });

  it('GET / unauth is 401', async () => {
    const r = await request(app).get('/api/users');
    expect(r.status).toBe(401);
  });

  it('POST / creates a user', async () => {
    const admin = await makeUser({ role: 'admin' });
    const r = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'New@Ex.com', fullName: 'New', role: 'sales', password: 'password1234' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ email: 'new@ex.com', fullName: 'New', role: 'sales', active: true });
  });

  it('POST / duplicate email is 409', async () => {
    const admin = await makeUser({ role: 'admin' });
    await makeUser({ email: 'dupe@ex.com' });
    const r = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'dupe@ex.com', fullName: 'X', role: 'sales', password: 'password1234' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CONFLICT');
  });

  it('POST / 422 on missing password', async () => {
    const admin = await makeUser({ role: 'admin' });
    const r = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'x@ex.com', fullName: 'X', role: 'sales' });
    expect(r.status).toBe(422);
  });

  it('POST / 422 on short password', async () => {
    const admin = await makeUser({ role: 'admin' });
    const r = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ email: 'x@ex.com', fullName: 'X', role: 'sales', password: 'short' });
    expect(r.status).toBe(422);
  });

  it('PATCH /:id deactivates user', async () => {
    const admin = await makeUser({ role: 'admin' });
    const target = await makeUser({ email: 't@ex.com' });
    const r = await request(app).patch(`/api/users/${target.id}`).set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ active: false });
    expect(r.status).toBe(200);
    expect(r.body.active).toBe(false);
  });

  it('PATCH /:id missing → 404', async () => {
    const admin = await makeUser({ role: 'admin' });
    const r = await request(app).patch('/api/users/9999').set('Authorization', `Bearer ${tokenFor(admin)}`).send({ fullName: 'x' });
    expect(r.status).toBe(404);
  });

  it('PATCH /:id empty body → 422', async () => {
    const admin = await makeUser({ role: 'admin' });
    const target = await makeUser();
    const r = await request(app).patch(`/api/users/${target.id}`).set('Authorization', `Bearer ${tokenFor(admin)}`).send({});
    expect(r.status).toBe(422);
  });
});
```

Manual tests:
- Seeded Admin logs in → token.
- `curl -H "Authorization: Bearer <token>" http://localhost:4000/api/users` → array.
- `curl -X POST .../api/users -d '{"email":"alice@ex.com","fullName":"Alice","role":"sales","password":"password1234"}'` → 201.
- Same POST again → 409.
- Login as Alice → token; `curl /api/users` with her token → 403.

**Quality**: ESLint 0; coverage ≥85% on routes file; no business logic in route handlers.

**OUT**:
- ❌ Frontend pages — Story 3.3.
- ❌ Re-activation flow surfaced as a separate endpoint (PATCH active:true is enough).
- ❌ Listing users with pagination — out of scope (MVP single org).
- ❌ Filtering / searching users — out of scope.
- ❌ Self-service password change — out of scope.

**Evidence**: Vitest int test output, `curl` transcript of happy + 403 + 409 cases.
