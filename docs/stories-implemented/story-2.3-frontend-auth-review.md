# Story 2.3 Self-Review

**Date**: 2026-05-20
**Story**: 2.3 - Frontend AuthProvider + LoginPage + RequireAuth/RequireRole
**Developer**: gourav.g@3pillarglobal.com
**Status**: Complete

---

## What Was Implemented

- Added `AuthProvider` with `{ user, token-backed status, login, logout }` behavior and `mvp-crm-token` persistence.
- Added `/api/auth/login` and `/api/auth/me` frontend API helpers.
- Added `/login` with email/password validation, 401 and 429 inline errors, pending submit state, and `next` redirect support.
- Added `RequireAuth` and `RequireRole` route guards.
- Wrapped `RouterProvider` with `AuthProvider` inside `QueryClientProvider`.
- Protected `/`, `/leads`, `/dashboard`, and `/users`; `/users` is role-gated for admins.
- Updated `AppShell` to show Login for anonymous users or `{fullName} / Logout` when authenticated.
- Updated `api()` to use `mvp-crm-token`, support `{ auth: false }`, normalize `/api` paths, parse backend error envelopes, and dispatch `auth:unauthorized` before throwing on 401.
- Repaired the pre-existing root ESLint config and installed root TypeScript ESLint tooling so frontend lint can run again.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/features/auth/AuthProvider.tsx` | New auth context, hydration, login, logout, unauthorized listener |
| `frontend/src/features/auth/useAuth.ts` | New hook re-export |
| `frontend/src/features/auth/LoginPage.tsx` | New login form and redirect handling |
| `frontend/src/features/auth/RequireAuth.tsx` | New auth route guard |
| `frontend/src/features/auth/RequireRole.tsx` | New role guard and 403 view |
| `frontend/src/features/auth/api.ts` | New auth API helpers |
| `frontend/src/api/client.ts` | Token key, auth opt-out, 401 event, error envelope support |
| `frontend/src/App.tsx` | AuthProvider added between QueryClientProvider and RouterProvider |
| `frontend/src/router.tsx` | Login route plus protected app routes |
| `frontend/src/ui/AppShell.tsx` | Login/logout/user slot |
| `frontend/src/types/index.ts` | User contract aligned to Story 2.3 |
| `frontend/package.json`, `package.json`, `package-lock.json` | Added `zod`; root lint tooling installed |
| `.eslintrc.cjs`, `frontend/tsconfig.json`, `frontend/src/test/setup.ts` | Maintenance fixes needed for verification |

## Test Evidence

```
npm.cmd --workspace frontend run build
Result: pass

npm.cmd --workspace frontend run test
Test Files: 11 passed
Tests:      49 passed
Coverage:   97.72% lines / 94.71% branches / 97.61% functions / 97.72% statements

npm.cmd --workspace frontend run lint
Result: pass, 0 errors
```

## Acceptance Criteria Notes

- Boot without token renders anonymous status.
- Boot with token hydrates via `/api/auth/me`.
- Hydration 401 clears `mvp-crm-token`.
- Login success stores token and redirects to `next`.
- Login 401 renders "Invalid email or password".
- Login 429 renders "Too many attempts. Try again in 15 minutes."
- Anonymous protected-route access redirects to `/login?next=...`.
- Wrong role renders a 403 card with a "Back to home" link.
- `api/client.ts` dispatches `auth:unauthorized` on 401 before throwing.

## Deviations / Maintenance

- Added lightweight placeholder elements for `/leads`, `/dashboard`, and `/users` so those paths are protected now and can be replaced by later stories.
- Added `frontend/tsconfig.json` `noEmit` and `paths` settings because plain `tsc` could not build the Vite workspace without them.
- Repaired `.eslintrc.cjs`; Story 1.4 had deferred lint because this file was malformed.
