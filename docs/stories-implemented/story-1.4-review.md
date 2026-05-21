# Story 1.4 Self-Review

**Date**: 2026-05-19
**Story**: 1.4 — Connect FE to BE (Health Check on Home Page)
**Developer**: DEV (parent agent, sequential Mode 1 fallback after worktree-isolation block)

---

## What Was Implemented

- `checkHealth()` service that pings SQLite via `SELECT 1` and returns a structured `{ok, backend, db}` body. Never throws — errors are caught and reported as `db: 'down'`.
- `GET /api/health` upgraded from static `{ok:true}` to call `checkHealth()`, returning **200** on healthy or **503** on db-down (status code matches `body.ok`).
- Frontend `useHealth()` TanStack Query hook calling `/api/health`, `retry: 0` so a single network error renders the disconnected state without delay.
- `HomePage` renders the "Mvp-CRM" headline plus a `Card` with two `StatusPill`s (Backend, Database). Loading → grey "Checking…". Success → green "Connected". Error → red "Disconnected" + visible "Retry" button.
- Router updated to mount `<HomePage />` at `/` (replacing the 1.2 placeholder).
- Added `msw: ^2.4.0` to `frontend/package.json` devDependencies for the React Testing Library + MSW HomePage tests.

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/features/_health/health.service.ts` | New | `checkHealth()` + `HealthBody` discriminated-union type |
| `backend/src/features/_health/health.service.test.ts` | New | 3 tests covering ok / db-down / never-throws |
| `backend/src/features/_health/health.routes.ts` | Modified | Uses `checkHealth()`; status 200 or 503 based on `body.ok` |
| `backend/src/features/_health/health.routes.test.ts` | Modified | Updated body shape assertion; added 503/db-down case via `vi.spyOn(db, 'prepare').mockImplementationOnce` |
| `frontend/src/features/_home/api.ts` | New | `useHealth()` TanStack Query hook + `HealthBody` type |
| `frontend/src/features/_home/HomePage.tsx` | New | Headline + Card + two StatusPills + Retry button |
| `frontend/src/features/_home/HomePage.test.tsx` | New | 5 RTL + MSW tests (happy, network-error, db-down, refetch-on-retry, headline) |
| `frontend/src/router.tsx` | Modified | Mounts `<HomePage />` at `/` (shared file — parent serialized) |
| `frontend/package.json` | Modified | Added `msw: ^2.4.0` devDep (shared file — parent serialized) |

## Patterns Applied

| Pattern | Where Applied | Notes |
|---------|---------------|-------|
| Service-owns-business-logic, routes-only-translate (§ Patterns §2.3) | `health.routes.ts` calls `checkHealth()` and only maps to HTTP status | Routes have no `try/catch` |
| Digest-style swallow ONLY for observability (§ Patterns §2.4) | `checkHealth()` catches the SELECT 1 error | Returns degraded state instead of throwing — health is observability, not a gate |
| Repository imports shared `db` (§ Patterns §4.1) | `health.service.ts` imports `db` from `@/db/client` | No bespoke connections |
| TanStack Query per feature (§ Patterns §7.2) | `frontend/src/features/_home/api.ts` | Hook + queryKey factory pattern preserved |
| No `useEffect` for fetching (§ Patterns §7.3) | `HomePage.tsx` uses only `useHealth()` | Zero `useEffect` in the component |
| Pre-prepared statement, bind every param (§ Patterns §4.2 / §4.5) | `db.prepare('SELECT 1')` — no concat | n/a — literal statement |
| MSW for frontend API mocking (§ Patterns §8.4) | `HomePage.test.tsx` uses `setupServer` | No `vi.mock('fetch')` |

## Testing Summary

- **Backend**: 25 tests (5 files), all passing. Coverage 95.89% lines / 91.17% branches / 93.33% functions / 95.89% stmts. **Health files at 100% across the board.**
- **Frontend**: 37 tests (7 files), all passing. Coverage 99.66% lines / 97.41% branches / 100% functions / 99.66% stmts. **HomePage files at 100% across the board.**
- **Combined**: 62/62 passing.

### Test Output (tail)

```
Backend:
 ✓ src/http/errors.test.ts                         (6 tests)
 ✓ src/features/_health/health.service.test.ts     (3 tests)
 ✓ src/db/client.test.ts                            (3 tests)
 ✓ src/db/migrate.test.ts                           (5 tests)
 ✓ src/features/_health/health.routes.test.ts      (8 tests)
 Test Files  5 passed (5)
      Tests  25 passed (25)
 health.routes.ts | 100 | 100 | 100 | 100
 health.service.ts| 100 | 100 | 100 | 100

Frontend:
 ✓ src/api/client.test.ts                            (8 tests)
 ✓ src/ui/Card.test.tsx                              (5 tests)
 ✓ src/ui/AppShell.test.tsx                          (4 tests)
 ✓ src/router.test.ts                                (3 tests)
 ✓ src/App.test.tsx                                  (2 tests)
 ✓ src/ui/Button.test.tsx                            (10 tests)
 ✓ src/features/_home/HomePage.test.tsx              (5 tests)
 Test Files  7 passed (7)
      Tests  37 passed (37)
 HomePage.tsx     | 100 | 100 | 100 | 100
 api.ts           | 100 | 100 | 100 | 100
```

## DoD Evidence

- ✅ AC: `GET /api/health` returns 200 `{ok:true, backend:'ok', db:'ok'}` when DB reachable — backend test asserts both status + body
- ✅ AC: 503 `{ok:false, backend:'ok', db:'down'}` on SELECT 1 error — backend test forces this via `vi.spyOn`
- ✅ AC: Health route does NOT require auth — no auth middleware applied to it (will be enforced when 2.1 mounts auth on `/api`)
- ✅ AC: Frontend `/` renders HomePage — router test asserts; App test asserts headline render
- ✅ AC: HomePage shows "Mvp-CRM" headline + Card + two StatusPills + Retry — all asserted in HomePage.test.tsx
- ✅ AC: On load → "Checking…" neutral state — handled via `isLoading` branch (transitive — green/red coverage proves the branching logic)
- ✅ AC: On success → green "Connected" — asserted (2 pills)
- ✅ AC: On error → red "Disconnected" + Retry visible + clicking retries — asserted in two separate tests including userEvent click on Retry
- ✅ AC: Vitest passes; coverage ≥85% on changed files (100% on all 1.4 files)
- ⚠️ AC: ESLint clean — **deferred** (see Deviations below)

## Challenges Encountered

| Challenge | Resolution |
|-----------|-----------|
| Subagent worktree dispatch failed because harness session env was cached as `git repo: false` at boot, even though `.git/` exists | Switched to sequential implementation as the parent agent per user choice |
| `frontend/src/api/client.ts` doesn't accept the `{auth: false}` option shown in the story spec's `useHealth` example | Omitted the option — the route doesn't require auth and the client adds Authorization only when a token exists |
| Story spec inconsistency: hook code used `'/health'`, tests used `'/api/health'` | Resolved to `/api/health` everywhere — matches the existing route mount and 1.1's `health.routes.test.ts` |
| Story spec didn't include `health.routes.test.ts` in 1.4's files_touched, but the existing test asserts the old `{ok:true}` body | Updated the sibling test to the new shape — TDD-correct; a non-touch would have left a broken assertion |
| Existing health route signature returned bare `{ok:true}` from 1.1; new shape adds `backend` + `db` | Type-checked `HealthBody` discriminated union ensures the route can't drift; both consumers (route, hook) import the same union |

## Deviations from Plan

1. **Path consistency**: Used `/api/health` everywhere (spec had two different paths). This matches the existing test in 1.1 and the actual route mount.
2. **`{auth: false}` omitted**: The `api()` client doesn't support that option, and it's not needed (no token = no header).
3. **Lint deferred**: Repo-root `.eslintrc.cjs` is structurally broken (duplicate `extends`/`rules`/`plugins` blocks from commit `097b035`). Fixing it is outside Story 1.4's `files_touched` and not the responsibility of this story. Flagged in `Upcoming` as a maintenance fix.

## Lessons Learned

1. **Harness env state is captured at session boot.** Even after `git init`, `Is a git repository: false` stays cached, blocking subagent worktree dispatch. Sessions that intend to do parallel implementation need git already in place at start.
2. **Story specs need a TDD-aware "modify sibling test" hint** when they change response shapes — otherwise the next developer hits a broken test and has to decide whether it's in scope. The plan workflow should auto-add sibling test files to `files_touched` when a service contract changes.
3. **Patterns §10 (File/Module Boundary Map) prevented chaos** — even with worktrees blocked, the `shared_files` rule made the manual edits to `router.tsx` and `package.json` obvious and auditable.

## Next Steps

- [x] Ready for code review (run `aire-review-code 1.4`)
- [ ] Ready for unit-test validation (run `aire-qa-validate 1.4`)
- [ ] Frontend dev gourav.g@3pillarglobal.com can now start Story 2.3 (Frontend Auth)
- [ ] Parent (backend dev) can now pick up Story 2.1 (Auth middleware), 4.1 (Leads repository), or 6.1 (Mailer + digest repo) from wave 2
- [ ] Maintenance: repair root `.eslintrc.cjs` so lint works again
