# Story 2.1 Self-Review

**Date**: 2026-05-20
**Story**: Auth Middleware + JWT Verify + requireRole + Rate Limiter
**Developer**: DEV Agent (subagent, Mode 2 parallel)

---

## What Was Implemented

- `authMiddleware` — Bearer JWT validation, HS256 against `JWT_SECRET`, attaches `req.user = { id, role }`
- `signToken` — helper exported from `auth.ts` (used by tests and future auth service)
- `requireRole(role)` — factory middleware that enforces admin/sales role; returns 401 if `req.user` absent, 403 if wrong role
- `loginRateLimit` — 5 req/15 min per IP via `express-rate-limit`, 429 with `RATE_LIMITED` code
- `app.ts` updated: `/api/health` mounted as public before `authMiddleware`; all other `/api` routes require valid JWT

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/http/middleware/auth.ts` | New | authMiddleware + signToken |
| `backend/src/http/middleware/requireRole.ts` | New | requireRole factory |
| `backend/src/http/middleware/rateLimit.ts` | New | loginRateLimit config |
| `backend/src/http/middleware/auth.test.ts` | New | 7 unit tests (valid + 6 rejection paths) |
| `backend/src/http/middleware/requireRole.test.ts` | New | 3 unit tests |
| `backend/src/types/express.d.ts` | New (shared) | req.id + req.user type augmentation |
| `backend/src/app.ts` | Modified (shared) | Wire authMiddleware; health public |
| `backend/package.json` | Modified (shared) | Added jsonwebtoken, express-rate-limit, nodemailer |
| `backend/src/test/factories.ts` | New (shared) | resetDb + makeUser test helpers |
| `backend/src/features/_health/health.routes.test.ts` | Modified | 404 test now sends Bearer token |

## Patterns Applied

| Pattern | Where Applied | Notes |
|---------|---------------|-------|
| Middleware composition (§ 5.4) | `app.ts` | Public routes before authMiddleware; auth before apiRouter |
| Error class usage (§ 2.3) | `auth.ts`, `requireRole.ts` | UnauthorizedError(401), ForbiddenError(403) |
| Test factories (§ 8.4) | `auth.test.ts`, `requireRole.test.ts` | Isolated test apps via `mkApp()` |

## Testing Summary

- **Unit Tests**: 10 written, all passing (7 auth + 3 requireRole)
- **Integration Tests**: N/A (deferred to story 2.2 — no public endpoint yet)
- **Coverage**: auth.ts 100%, requireRole.ts 100% (exceeds ≥90% critical file target)

**Test Output**:
```
Test Files  2 passed (2)
     Tests  10 passed (10)
```

## DoD Evidence

| Requirement | Evidence |
|-------------|----------|
| Valid Bearer JWT → req.user attached | `auth.test.ts:11` — `expect(res.body.user).toEqual({ id: 42, role: 'sales' })` |
| Missing/malformed/expired JWT → 401 UNAUTHORIZED | `auth.test.ts:17-25` — 6 parametrized cases all return 401 |
| requireRole('admin') blocks sales → 403 | `requireRole.test.ts:24` |
| requireRole returns 401 if no req.user | `requireRole.test.ts:28` |
| app.ts wiring order per § 5.4 | `app.ts:20-29` — requestId→pino→cors→json→/health(public)→authMiddleware→apiRouter |
| Coverage ≥90% on middleware (critical files) | auth.ts 100%, requireRole.ts 100% |
| JWT_SECRET never in logs | grep: no `JWT_SECRET` value in any log output |

## Challenges Encountered

| Challenge | Resolution |
|-----------|------------|
| Health route test broke when authMiddleware added to `/api` | Mounted `/api/health` before authMiddleware in app.ts; updated test to send Bearer token for 404 check |
| factories.ts `__dirname` path was `../../../migrations` (1 level too deep) | Fixed to `../../migrations`; removed symlink workaround |

## Deviations from Plan

- Health route mounted as a public exception before authMiddleware (story spec didn't address this; architecturally required to preserve story 1.4's walking skeleton)

## Lessons Learned

1. When wiring auth globally on `/api`, explicitly exempt public endpoints (health, auth) before the authMiddleware mount
2. Module-level prepared statements in repositories require migrations to run before module import — factories.ts handles this at import time

## Next Steps

- [ ] Ready for code review
- [ ] Story 2.2 (Auth service + routes) can now be implemented
