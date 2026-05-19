### Story 2.2: Auth Service + /auth/login + /auth/me

**Epic**: 2 - AUTHENTICATION | **ID**: 2.2 | **Date**: 2026-05-19 | **GitHub**: #6
**Requires**: [1.3, 2.1]
**Enables**: [2.4, 3.1]
**Files Touched**:
  - backend/src/features/auth/auth.routes.ts
  - backend/src/features/auth/auth.service.ts
  - backend/src/features/auth/auth.schemas.ts
  - backend/src/features/auth/auth.service.test.ts
  - backend/src/features/users/users.repository.ts
  - backend/src/routes.ts
  - backend/src/app.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § API Design / Auth endpoints, § Security Design (Authentication).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — §§ 4, 5.

**Description**:
Implements the two public-ish endpoints: `POST /api/auth/login` (returns a JWT on valid email+password) and `GET /api/auth/me` (returns the authed user profile). Introduces a minimal `users.repository.ts` with `findByEmail` and `findById` — that file is OWNED by Story 3.1 going forward, but seeded here because auth needs to look up users. Bcrypt-compare runs at constant time (`bcrypt.compare`). Failed login returns a generic message ("Invalid credentials") with no user-enumeration. `/auth/me` is mounted under `/api/auth` but protected by `authMiddleware` — special-cased so login stays public while `me` requires a token.

**Acceptance Criteria**:
- `POST /api/auth/login` with `{email, password}`:
  - Email is lowercased before lookup.
  - On success: returns `200 { token, user: { id, email, fullName, role } }`. Token is a 24h HS256 JWT with `sub=userId`, `role`.
  - On unknown email OR wrong password: returns `401 { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }` — same payload for both (no user enumeration).
  - On inactive user (`active=0`): returns `401 { error: { code: 'INVALID_CREDENTIALS', ... } }` — same payload (don't leak active state).
  - On request body validation failure: returns `422` with the Zod issues envelope.
  - Rate limited per Story 2.1: 6th attempt in 15 min from same IP → 429.
- `GET /api/auth/me` (requires JWT):
  - Returns `200 { id, email, fullName, role }` for the authed user.
  - Returns 401 on missing/invalid token.
  - Returns 401 if the user was deleted/deactivated AFTER token issue.
- `users.repository.ts` exposes only `findByEmail(email)` and `findById(id)` in this story (Story 3.1 extends with create/list/patch).
- Camel/snake mapping handled in the repository (`rowToUser`).
- Coverage ≥90% on `auth.service.ts` (critical file per patterns); 0 ESLint errors.
- No `password`, `password_hash`, or `token` field appears in any log line (verified by pino redact config from 1.1).

**Prerequisites**: 1.3 (users table), 2.1 (auth middleware + `signToken`).

**Context**:
- `backend/src/http/middleware/auth.ts` (2.1 — `signToken`).
- `backend/src/db/client.ts` (1.3).
- `backend/src/http/errors.ts` (1.1).

**Patterns**: Route file shape (§ 5.1); Zod schemas as contract (§ 5.2); error envelope (§ 5.3); rowToObj mapping (§ 5.5); never trust client role (§ Security).

**Steps**:

1. **Users repository (minimal, extended in 3.1)** — `backend/src/features/users/users.repository.ts`:
   ```ts
   import { db } from '@/db/client';

   export interface UserRow {
     id: number; email: string; password_hash: string; full_name: string;
     role: 'admin' | 'sales'; active: number; created_at: string; updated_at: string;
   }
   export interface User {
     id: number; email: string; fullName: string; role: 'admin' | 'sales'; active: boolean;
   }

   function rowToUser(r: UserRow): User {
     return { id: r.id, email: r.email, fullName: r.full_name, role: r.role, active: r.active === 1 };
   }

   const findByEmailStmt = db.prepare<{ email: string }>('SELECT * FROM users WHERE email = :email');
   const findByIdStmt    = db.prepare<{ id: number }>('SELECT * FROM users WHERE id = :id');

   export const usersRepository = {
     findByEmail(email: string): (UserRow & { user: User }) | null {
       const row = findByEmailStmt.get({ email: email.toLowerCase() }) as UserRow | undefined;
       return row ? { ...row, user: rowToUser(row) } : null;
     },
     findById(id: number): User | null {
       const row = findByIdStmt.get({ id }) as UserRow | undefined;
       return row ? rowToUser(row) : null;
     },
   };
   ```

2. **Auth schemas** — `backend/src/features/auth/auth.schemas.ts`:
   ```ts
   import { z } from 'zod';
   export const LoginSchema = z.object({
     email: z.string().email().max(254),
     password: z.string().min(1).max(1024),
   }).strict();
   export type LoginInput = z.infer<typeof LoginSchema>;
   ```

3. **Auth service** — `backend/src/features/auth/auth.service.ts`:
   ```ts
   import bcrypt from 'bcrypt';
   import { usersRepository, type User } from '@/features/users/users.repository';
   import { signToken } from '@/http/middleware/auth';
   import { AppError } from '@/http/errors';

   class InvalidCredentialsError extends AppError {
     constructor() { super('INVALID_CREDENTIALS', 401, 'Invalid credentials'); }
   }

   export const authService = {
     async login(email: string, password: string): Promise<{ token: string; user: User }> {
       const found = usersRepository.findByEmail(email);
       // Always run bcrypt to avoid timing leak when email is unknown.
       const hash = found?.password_hash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali';
       const ok = await bcrypt.compare(password, hash);
       if (!found || !ok || found.active !== 1) throw new InvalidCredentialsError();
       const token = signToken({ id: found.id, role: found.role });
       return { token, user: found.user };
     },
     me(userId: number): User {
       const u = usersRepository.findById(userId);
       if (!u || !u.active) throw new InvalidCredentialsError();
       return u;
     },
   };
   ```

4. **Auth routes** — `backend/src/features/auth/auth.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { LoginSchema } from './auth.schemas';
   import { authService } from './auth.service';
   import { authMiddleware } from '@/http/middleware/auth';
   import { loginRateLimit } from '@/http/middleware/rateLimit';

   export const authRouter = Router();

   authRouter.post('/login', loginRateLimit, async (req, res, next) => {
     try {
       const input = LoginSchema.parse(req.body);
       const result = await authService.login(input.email, input.password);
       res.json(result);
     } catch (e) { next(e); }
   });

   authRouter.get('/me', authMiddleware, (req, res, next) => {
     try { res.json(authService.me(req.user!.id)); } catch (e) { next(e); }
   });
   ```

5. **Wire into app + routes** — patch `backend/src/app.ts` and `backend/src/routes.ts`:
   ```ts
   // app.ts — replace the marker from 2.1:
   import { authRouter } from './features/auth/auth.routes';
   // ...
   app.use('/api/auth', authRouter);   // public + GET /me protected within router
   app.use('/api', authMiddleware);    // everything else requires JWT
   app.use('/api', apiRouter);
   ```
   ```ts
   // routes.ts — no change required; auth is mounted at app.ts level (public path)
   ```

**Tests**:

```ts
// backend/src/features/auth/auth.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { db } from '@/db/client';
import { authService } from './auth.service';

beforeEach(() => {
  db.exec('DELETE FROM users');
});

async function seedUser(extra: Partial<{ active: number; role: 'admin' | 'sales' }> = {}) {
  const hash = await bcrypt.hash('password123', 4);
  const now = new Date().toISOString();
  const info = db.prepare(`INSERT INTO users (email,password_hash,full_name,role,active,created_at,updated_at)
                           VALUES (?,?,?,?,?,?,?)`)
    .run('alice@example.com', hash, 'Alice', extra.role ?? 'sales', extra.active ?? 1, now, now);
  return Number(info.lastInsertRowid);
}

describe('authService.login', () => {
  it('returns token + user on valid creds', async () => {
    const id = await seedUser();
    const r = await authService.login('alice@example.com', 'password123');
    expect(r.token).toMatch(/^eyJ/);
    expect(r.user).toMatchObject({ id, email: 'alice@example.com', role: 'sales', active: true });
  });
  it('rejects unknown email with INVALID_CREDENTIALS', async () => {
    await expect(authService.login('nobody@example.com', 'x')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
  it('rejects wrong password', async () => {
    await seedUser();
    await expect(authService.login('alice@example.com', 'wrong')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
  it('rejects inactive user', async () => {
    await seedUser({ active: 0 });
    await expect(authService.login('alice@example.com', 'password123')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
  it('treats email case-insensitively', async () => {
    await seedUser();
    const r = await authService.login('Alice@Example.com', 'password123');
    expect(r.user.email).toBe('alice@example.com');
  });
});

describe('authService.me', () => {
  it('returns the user for a valid id', async () => {
    const id = await seedUser();
    expect(authService.me(id)).toMatchObject({ id, role: 'sales' });
  });
  it('throws on deactivated user', async () => {
    const id = await seedUser({ active: 0 });
    expect(() => authService.me(id)).toThrow(/INVALID_CREDENTIALS/);
  });
});
```

Manual tests:
- `npm run seed` → admin exists.
- `curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"<seeded>"}'` → 200 with token + user.
- Wrong password → 401 with `INVALID_CREDENTIALS`.
- `curl http://localhost:4000/api/auth/me -H "Authorization: Bearer <token>"` → 200 with admin user.
- Hit `/api/auth/login` 6 times with wrong creds → 6th → 429.

**Quality**: ESLint 0; coverage ≥90% on `auth.service.ts`; no plaintext password or token in logs; bcrypt cost in tests is 4 (speed), real env uses 12.

**OUT**:
- ❌ Frontend login UI — Story 2.3.
- ❌ Password reset / email verification — explicit OUT per requirements.
- ❌ Refresh tokens — explicit OUT.
- ❌ Logout endpoint — N/A (JWT discarded client-side; no server session).
- ❌ Multi-factor auth — out of scope.

**Evidence**: Vitest output with all 7 cases green; `curl` transcript of login + me + wrong-password.
