### Story 2.1: Auth Middleware + JWT Verify + requireRole + Rate Limiter

**Epic**: 2 - AUTHENTICATION | **ID**: 2.1 | **Date**: 2026-05-19 | **GitHub**: #5
**Requires**: [1.1]
**Enables**: [2.2, 4.2]
**Files Touched**:
  - backend/package.json
  - backend/src/http/middleware/auth.ts
  - backend/src/http/middleware/requireRole.ts
  - backend/src/http/middleware/rateLimit.ts
  - backend/src/http/middleware/auth.test.ts
  - backend/src/http/middleware/requireRole.test.ts
  - backend/src/types/express.d.ts
  - backend/src/app.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Security Design (Authentication, Authorization, Threat model).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 5.4 (Authentication wiring).

**Description**:
Adds JWT verification, role gating, and login rate limiting as reusable Express middleware. `authMiddleware` parses `Authorization: Bearer <jwt>`, verifies HS256 against `env.JWT_SECRET`, and attaches `req.user = { id, role }`. `requireRole(role)` factory rejects with `ForbiddenError` if `req.user.role` doesn't match. `loginRateLimit` caps `/auth/login` to 5 attempts per 15 min per IP (in-memory store; MVP-acceptable). Wires these into `app.ts` per patterns § 5.4: `authRouter` is mounted on `/api/auth` BEFORE the global `authMiddleware` (so login is public); everything mounted on `/api` AFTER `authMiddleware` requires a valid JWT. No login route is added here (that's 2.2) — this story exposes only the middleware contracts.

**Acceptance Criteria**:
- `Authorization: Bearer <valid JWT>` → `req.user = { id: number, role: 'admin'|'sales' }`, request proceeds.
- Missing header → `401 { error: { code: 'UNAUTHORIZED', ... } }`, no `req.user`.
- Malformed header (no "Bearer ", junk token) → 401.
- Expired JWT → 401.
- JWT signed with wrong secret → 401.
- JWT payload missing `sub` or `role` → 401.
- `requireRole('admin')` blocks `sales` users with 403; allows admin through.
- `requireRole('admin')` returns 401 (not 403) if `authMiddleware` didn't populate `req.user` (defensive — middleware order matters).
- `loginRateLimit`: 6th request from same IP within 15 min → `429 { error: { code: 'RATE_LIMITED', ... } }`; counter resets after 15 min.
- `app.ts` wires middleware in the order: requestId → pino-http → cors → json → `/api/auth` (public) → `authMiddleware` → other routes → errorHandler.
- Unit tests cover all the failure paths above with Vitest; coverage ≥85% on changed middleware files (≥90% per patterns critical-file rule).

**Prerequisites**: 1.1 (app factory, error classes, env loader).

**Context**:
- `backend/src/http/errors.ts` (1.1).
- `backend/src/app.ts` (1.1 — extending).
- `backend/src/config/env.ts` (1.1 — `JWT_SECRET`, `JWT_TTL_SECONDS`).

**Patterns**: Middleware composition (§ 5.4); error class usage (§ 2.3); test factories (§ 8.4).

**Steps**:

1. **Deps** — add to `backend/package.json` (shared file):
   ```json
   {
     "dependencies": {
       "jsonwebtoken": "9.0.2",
       "express-rate-limit": "^7.4.0"
     },
     "devDependencies": { "@types/jsonwebtoken": "^9.0.6" }
     }
   ```

2. **Type augmentation** — `backend/src/types/express.d.ts` (shared file):
   ```ts
   import 'express';
   declare module 'express-serve-static-core' {
     interface Request {
       id?: string;          // set by requestId in 1.1
       user?: { id: number; role: 'admin' | 'sales' };
     }
   }
   ```

3. **Auth middleware** — `backend/src/http/middleware/auth.ts`:
   ```ts
   import type { RequestHandler } from 'express';
   import jwt from 'jsonwebtoken';
   import { env } from '@/config/env';
   import { UnauthorizedError } from '../errors';

   interface JwtPayload { sub: string | number; role: 'admin' | 'sales'; iat: number; exp: number; }

   export const authMiddleware: RequestHandler = (req, _res, next) => {
     const header = req.header('authorization');
     if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError());
     const token = header.slice(7).trim();
     try {
       const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
       if (!payload?.sub || (payload.role !== 'admin' && payload.role !== 'sales')) {
         return next(new UnauthorizedError());
       }
       req.user = { id: Number(payload.sub), role: payload.role };
       next();
     } catch {
       next(new UnauthorizedError());
     }
   };

   export function signToken(user: { id: number; role: 'admin' | 'sales' }): string {
     return jwt.sign({ role: user.role }, env.JWT_SECRET, {
       subject: String(user.id),
       expiresIn: env.JWT_TTL_SECONDS,
       algorithm: 'HS256',
     });
   }
   ```

4. **requireRole middleware** — `backend/src/http/middleware/requireRole.ts`:
   ```ts
   import type { RequestHandler } from 'express';
   import { ForbiddenError, UnauthorizedError } from '../errors';

   export function requireRole(role: 'admin' | 'sales'): RequestHandler {
     return (req, _res, next) => {
       if (!req.user) return next(new UnauthorizedError());
       if (req.user.role !== role) return next(new ForbiddenError());
       next();
     };
   }
   ```

5. **Login rate limiter** — `backend/src/http/middleware/rateLimit.ts`:
   ```ts
   import rateLimit from 'express-rate-limit';
   import type { Request, Response } from 'express';

   export const loginRateLimit = rateLimit({
     windowMs: 15 * 60 * 1000,
     limit: 5,
     standardHeaders: 'draft-7',
     legacyHeaders: false,
     handler: (_req: Request, res: Response) => {
       res.status(429).json({
         error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
       });
     },
   });
   ```

6. **Wire middleware in `app.ts`** — patch (shared file from 1.1):
   ```ts
   // ...existing imports
   import { authMiddleware } from './http/middleware/auth';

   export function buildApp() {
     const app = express();
     app.use(requestId);
     app.use(pinoHttp({ logger, customProps: (req) => ({ reqId: req.id, userId: req.user?.id }) }));
     app.use(cors({ origin: env.CORS_ORIGIN }));
     app.use(express.json({ limit: '100kb' }));
     // /api/auth is mounted by the auth router itself in 2.2 — keep this commented marker:
     //   app.use('/api/auth', authRouter);          // <-- public; added in 2.2
     app.use('/api', authMiddleware);                // <-- everything else requires JWT
     app.use('/api', apiRouter);
     app.use((_req, _res, next) => next(new NotFoundError('Route')));
     app.use(errorHandler);
     return app;
   }
   ```
   *Note*: Story 2.2 will insert the `app.use('/api/auth', authRouter);` line BEFORE the `authMiddleware` mount. 2.1 leaves the marker comment so 2.2 has a clear insertion point.

**Tests**:

```ts
// backend/src/http/middleware/auth.test.ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authMiddleware, signToken } from './auth';
import { errorHandler } from './errorHandler';
import { env } from '@/config/env';

function mkApp() {
  const app = express();
  app.get('/protected', authMiddleware, (req, res) => res.json({ user: req.user }));
  app.use(errorHandler);
  return app;
}

describe('authMiddleware', () => {
  it('attaches req.user on a valid token', async () => {
    const token = signToken({ id: 42, role: 'sales' });
    const res = await request(mkApp()).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 42, role: 'sales' });
  });
  it.each([
    ['missing header', () => undefined],
    ['junk header', () => 'NotBearer xyz'],
    ['malformed token', () => 'Bearer abc.def.ghi'],
    ['wrong secret', () => `Bearer ${jwt.sign({ role: 'admin' }, 'wrong-secret-32-chars-min-aaaaa', { subject: '1' })}`],
    ['expired', () => `Bearer ${jwt.sign({ role: 'admin' }, env.JWT_SECRET, { subject: '1', expiresIn: -10 })}`],
    ['bad role', () => `Bearer ${jwt.sign({ role: 'hacker' }, env.JWT_SECRET, { subject: '1' })}`],
  ])('returns 401 when %s', async (_label, mk) => {
    const req = request(mkApp()).get('/protected');
    const h = mk();
    const res = await (h ? req.set('Authorization', h) : req);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
```

```ts
// backend/src/http/middleware/requireRole.test.ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireRole } from './requireRole';
import { authMiddleware, signToken } from './auth';
import { errorHandler } from './errorHandler';

function mkApp() {
  const app = express();
  app.get('/admin-only', authMiddleware, requireRole('admin'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requireRole', () => {
  it('lets admin through', async () => {
    const t = signToken({ id: 1, role: 'admin' });
    const res = await request(mkApp()).get('/admin-only').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
  });
  it('returns 403 for sales', async () => {
    const t = signToken({ id: 1, role: 'sales' });
    const res = await request(mkApp()).get('/admin-only').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
  it('returns 401 when no token at all', async () => {
    const res = await request(mkApp()).get('/admin-only');
    expect(res.status).toBe(401);
  });
});
```

Manual tests: defer to Story 2.2 (no public endpoint yet; this story is middleware-only).

**Quality**: ESLint 0; Prettier clean; Vitest passes; coverage ≥90% on middleware (critical files); JWT_SECRET never appears in any log line (verify by grepping logs).

**OUT**:
- ❌ The `/auth/login` and `/auth/me` routes — Story 2.2.
- ❌ Frontend interceptors — Story 2.3.
- ❌ Refresh tokens — explicit OUT per requirements.
- ❌ Distributed rate limiter (Redis) — MVP uses in-memory.
- ❌ CSRF tokens — N/A per DR-4 (JWT in header, not cookie).

**Evidence**: Vitest output for `auth.test.ts` + `requireRole.test.ts` showing all cases pass and coverage ≥90%.
