### Story 2.4: Auth Integration Tests (Supertest + MSW)

**Epic**: 2 - AUTHENTICATION | **ID**: 2.4 | **Date**: 2026-05-19 | **GitHub**: #8
**Requires**: [2.2, 2.3]
**Enables**: []
**Files Touched**:
  - backend/src/features/auth/auth.routes.int.test.ts
  - backend/src/test/factories.ts
  - frontend/src/features/auth/LoginPage.test.tsx
  - frontend/src/test/handlers.ts
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 8 (Testing Patterns), especially § 8.5 (integration tests) and § 8.4 (mocking strategy).
- Story 2.2 (BE endpoints), Story 2.3 (FE auth flow).

**Description**:
Adds the integration safety net for Epic 2. On the backend, hits `/api/auth/login` and `/api/auth/me` via Supertest against a real `buildApp()` + real in-memory SQLite (no service mocks) — proving the wire format, the middleware order, the rate limiter, and the role gate all behave together. On the frontend, exercises `LoginPage` via React Testing Library + MSW: happy path, 401, 429. Introduces two shared test utility files used by every future integration test: `backend/src/test/factories.ts` (resetDb, makeUser, tokenFor) and `frontend/src/test/handlers.ts` (default MSW handlers for auth).

**Acceptance Criteria**:
- `backend/src/test/factories.ts` exports `resetDb()`, `makeUser({email?,password?,role?,active?})`, `tokenFor(user)`.
  - `resetDb()` deletes from `digest_runs`, `leads`, `users` (FK order); runs idempotently.
  - `makeUser` hashes with cost=4 (fast) and inserts into `users`; returns `{id,email,fullName,role,active}` + the plaintext password used.
  - `tokenFor(user)` calls `signToken({id,role})`.
- Backend integration test covers, against the real `buildApp()`:
  - 200 happy login (returns token + user), `/auth/me` accepts that token and returns the same user.
  - Wrong password → 401 INVALID_CREDENTIALS.
  - Unknown email → 401 INVALID_CREDENTIALS (same payload).
  - Inactive user → 401 INVALID_CREDENTIALS.
  - 422 on missing email field.
  - 6th rapid attempt → 429 RATE_LIMITED.
  - `/auth/me` without header → 401 UNAUTHORIZED.
  - `/auth/me` with wrong-secret token → 401.
- `frontend/src/test/handlers.ts` exports a `defaultAuthHandlers` array (login success, me success) for reuse.
- `LoginPage.test.tsx` covers:
  - Submitting valid creds → calls `login`, navigates to `/`.
  - 401 → inline "Invalid email or password" via `role="alert"`.
  - 429 → inline "Too many attempts…".
  - Submit button disabled while pending.
- Total combined integration tests run < 5s.
- 0 ESLint errors; coverage gates respected.

**Prerequisites**: 2.2 (BE endpoints), 2.3 (FE auth provider + login page).

**Context**:
- `backend/src/app.ts`, all auth files from 2.1 + 2.2.
- `frontend/src/features/auth/*` from 2.3.

**Patterns**: HTTP boundary tests via Supertest (§ 8.5); MSW handlers, never `vi.mock('fetch')` (§ 8.4); AAA naming (§ 8.3).

**Steps**:

1. **Backend test factories** — `backend/src/test/factories.ts`:
   ```ts
   import bcrypt from 'bcrypt';
   import { db } from '@/db/client';
   import { signToken } from '@/http/middleware/auth';

   export function resetDb() {
     db.exec('DELETE FROM digest_runs; DELETE FROM leads; DELETE FROM users; DELETE FROM sqlite_sequence;');
   }

   export interface MadeUser { id: number; email: string; fullName: string; role: 'admin' | 'sales'; active: boolean; password: string; }
   export async function makeUser(extra: Partial<{ email: string; password: string; role: 'admin'|'sales'; active: boolean; fullName: string }> = {}): Promise<MadeUser> {
     const email = (extra.email ?? `user-${Math.random().toString(36).slice(2,8)}@ex.com`).toLowerCase();
     const password = extra.password ?? 'password123';
     const fullName = extra.fullName ?? 'Test User';
     const role = extra.role ?? 'sales';
     const active = extra.active !== false;
     const hash = await bcrypt.hash(password, 4);
     const now = new Date().toISOString();
     const info = db.prepare(`INSERT INTO users (email,password_hash,full_name,role,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`)
       .run(email, hash, fullName, role, active ? 1 : 0, now, now);
     return { id: Number(info.lastInsertRowid), email, fullName, role, active, password };
   }

   export function tokenFor(u: { id: number; role: 'admin' | 'sales' }): string {
     return signToken(u);
   }
   ```

2. **Backend integration tests** — `backend/src/features/auth/auth.routes.int.test.ts`:
   ```ts
   import request from 'supertest';
   import { describe, it, expect, beforeEach } from 'vitest';
   import { buildApp } from '@/app';
   import { resetDb, makeUser, tokenFor } from '@/test/factories';
   import jwt from 'jsonwebtoken';

   describe('Auth integration', () => {
     const app = buildApp();
     beforeEach(resetDb);

     it('logs in with valid creds and /me echoes the user', async () => {
       const u = await makeUser({ email: 'admin@ex.com', password: 'admin12345', role: 'admin' });
       const r = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
       expect(r.status).toBe(200);
       expect(r.body.token).toBeTruthy();
       expect(r.body.user).toMatchObject({ email: 'admin@ex.com', role: 'admin' });

       const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${r.body.token}`);
       expect(me.status).toBe(200);
       expect(me.body).toMatchObject({ email: 'admin@ex.com', role: 'admin' });
     });

     it.each([
       ['wrong password', async () => { const u = await makeUser(); return { email: u.email, password: 'WRONG' }; }],
       ['unknown email',  async () => ({ email: 'nope@ex.com', password: 'x' })],
       ['inactive user',  async () => { const u = await makeUser({ active: false }); return { email: u.email, password: u.password }; }],
     ])('rejects %s with INVALID_CREDENTIALS', async (_label, mk) => {
       const body = await mk();
       const r = await request(app).post('/api/auth/login').send(body);
       expect(r.status).toBe(401);
       expect(r.body.error.code).toBe('INVALID_CREDENTIALS');
     });

     it('422 on missing email', async () => {
       const r = await request(app).post('/api/auth/login').send({ password: 'x' });
       expect(r.status).toBe(422);
       expect(r.body.error.code).toBe('VALIDATION_ERROR');
     });

     it('429 after 5 failed attempts in the window', async () => {
       const u = await makeUser();
       for (let i = 0; i < 5; i++) {
         const r = await request(app).post('/api/auth/login').send({ email: u.email, password: 'WRONG' });
         expect(r.status).toBe(401);
       }
       const r6 = await request(app).post('/api/auth/login').send({ email: u.email, password: 'WRONG' });
       expect(r6.status).toBe(429);
       expect(r6.body.error.code).toBe('RATE_LIMITED');
     });

     it('/me without token is 401', async () => {
       const r = await request(app).get('/api/auth/me');
       expect(r.status).toBe(401);
     });

     it('/me with wrong-secret token is 401', async () => {
       const bad = jwt.sign({ role: 'admin' }, 'a'.repeat(40), { subject: '1' });
       const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bad}`);
       expect(r.status).toBe(401);
     });
   });
   ```

3. **Frontend MSW handlers** — `frontend/src/test/handlers.ts`:
   ```ts
   import { http, HttpResponse } from 'msw';

   export const defaultAuthHandlers = [
     http.post('/api/auth/login', async ({ request }) => {
       const body = await request.json() as { email: string; password: string };
       if (body.email === 'admin@ex.com' && body.password === 'admin12345') {
         return HttpResponse.json({
           token: 'fake-jwt',
           user: { id: 1, email: 'admin@ex.com', fullName: 'Admin', role: 'admin', active: true },
         });
       }
       return HttpResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }, { status: 401 });
     }),
     http.get('/api/auth/me', ({ request }) => {
       const auth = request.headers.get('authorization');
       if (auth?.includes('fake-jwt')) {
         return HttpResponse.json({ id: 1, email: 'admin@ex.com', fullName: 'Admin', role: 'admin', active: true });
       }
       return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401 });
     }),
   ];
   ```

4. **Frontend LoginPage tests** — `frontend/src/features/auth/LoginPage.test.tsx`:
   ```tsx
   import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { setupServer } from 'msw/node';
   import { http, HttpResponse } from 'msw';
   import { MemoryRouter, Routes, Route } from 'react-router-dom';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { AuthProvider } from './AuthProvider';
   import { LoginPage } from './LoginPage';
   import { defaultAuthHandlers } from '@/test/handlers';

   const server = setupServer(...defaultAuthHandlers);
   beforeAll(() => server.listen());
   afterEach(() => { server.resetHandlers(...defaultAuthHandlers); localStorage.clear(); });
   afterAll(() => server.close());

   function wrap(ui: React.ReactNode, initial = '/login') {
     const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
     return (
       <QueryClientProvider client={qc}>
         <AuthProvider>
           <MemoryRouter initialEntries={[initial]}>
             <Routes>
               <Route path="/login" element={ui} />
               <Route path="/" element={<div>HOME</div>} />
             </Routes>
           </MemoryRouter>
         </AuthProvider>
       </QueryClientProvider>
     );
   }

   describe('LoginPage', () => {
     it('logs in with valid creds and navigates home', async () => {
       const u = userEvent.setup();
       render(wrap(<LoginPage />));
       await u.type(screen.getByLabelText(/email/i), 'admin@ex.com');
       await u.type(screen.getByLabelText(/password/i), 'admin12345');
       await u.click(screen.getByRole('button', { name: /sign in/i }));
       expect(await screen.findByText('HOME')).toBeInTheDocument();
     });

     it('shows inline error on 401', async () => {
       const u = userEvent.setup();
       render(wrap(<LoginPage />));
       await u.type(screen.getByLabelText(/email/i), 'admin@ex.com');
       await u.type(screen.getByLabelText(/password/i), 'WRONG');
       await u.click(screen.getByRole('button', { name: /sign in/i }));
       expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
     });

     it('shows 429 inline error', async () => {
       server.use(http.post('/api/auth/login', () =>
         HttpResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' } }, { status: 429 })));
       const u = userEvent.setup();
       render(wrap(<LoginPage />));
       await u.type(screen.getByLabelText(/email/i), 'admin@ex.com');
       await u.type(screen.getByLabelText(/password/i), 'admin12345');
       await u.click(screen.getByRole('button', { name: /sign in/i }));
       expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
     });
   });
   ```

Manual tests:
- `npm --workspace backend run test -- auth.routes.int` → all 7 cases green in ≤2s.
- `npm --workspace frontend run test -- LoginPage` → all 3 cases green.
- `npm test` from root → combined run is green.

**Quality**: ESLint 0; combined coverage on changed files ≥85%; no `vi.mock('fetch')` and no `vi.mock('better-sqlite3')` anywhere.

**OUT**:
- ❌ E2E browser tests (Playwright/Cypress) — out of scope for MVP.
- ❌ Load testing — out of scope (k6 lives in QA workflow).
- ❌ Tests for user CRUD — Story 3.2.
- ❌ Test fixtures for leads/digest — those add to factories in their own stories.

**Evidence**: Vitest run output (BE + FE) with timing and coverage delta.
