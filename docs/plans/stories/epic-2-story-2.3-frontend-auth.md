### Story 2.3: Frontend AuthProvider + LoginPage + RequireAuth/RequireRole

**Epic**: 2 - AUTHENTICATION | **ID**: 2.3 | **Date**: 2026-05-19 | **GitHub**: #7
**Requires**: [1.2, 1.4]
**Enables**: [2.4, 3.3, 4.4, 5.2]
**Files Touched**:
  - frontend/src/features/auth/AuthProvider.tsx
  - frontend/src/features/auth/useAuth.ts
  - frontend/src/features/auth/LoginPage.tsx
  - frontend/src/features/auth/RequireAuth.tsx
  - frontend/src/features/auth/RequireRole.tsx
  - frontend/src/features/auth/api.ts
  - frontend/src/api/client.ts
  - frontend/src/App.tsx
  - frontend/src/router.tsx
  - frontend/src/types/index.ts
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Security (JWT in localStorage), § DR-4.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 7 (Frontend Patterns).
- Story 2.2 — `/api/auth/login` + `/api/auth/me` contracts.

**Description**:
Closes the auth loop on the frontend. Introduces an `AuthProvider` context that holds `{ user, token, status }`, exposes `login(email,password)` and `logout()` methods, and persists the JWT in `localStorage` under key `mvp-crm-token`. On mount, if a token exists, it calls `GET /api/auth/me` to hydrate the user (and clears the token if the call returns 401). Adds a `LoginPage` with a React Hook Form-less Zod-validated form (kept minimal here; RHF lands in Story 4.5). Adds `RequireAuth` and `RequireRole` route guards. Adds a 401 interceptor to `api/client.ts` that fires a `window` event `auth:unauthorized` which `AuthProvider` listens for and uses to log out. Adds a Login link/Logout button + user name to `AppShell` (touches shared file).

**Acceptance Criteria**:
- `AuthProvider` wraps the app inside `QueryClientProvider` (so query hooks can read auth) and outside `RouterProvider`.
- `useAuth()` returns `{ user: User | null, status: 'loading' | 'authed' | 'anon', login, logout }`.
- On app boot:
  - If `localStorage['mvp-crm-token']` is empty → `status='anon'`.
  - If present → `status='loading'` → calls `/api/auth/me`:
    - 200 → `status='authed'`, `user` set.
    - 401 → token cleared, `status='anon'`.
- `LoginPage` (`/login`):
  - Email + password inputs with HTML5 validation + Zod parse on submit.
  - On submit → calls `login(...)`; on success → redirects to `?next=...` query param or `/`.
  - On 401 → inline error "Invalid email or password" (no user enumeration).
  - On 429 → inline error "Too many attempts. Try again in 15 minutes."
  - Disables submit button while pending.
- `RequireAuth` route element:
  - If `status==='anon'` → `<Navigate to="/login?next=…current path…" replace />`.
  - If `status==='loading'` → render a centered spinner.
  - Else → `<Outlet />`.
- `RequireRole`:
  - Wraps children; if `user.role !== role` → render a "403 — Forbidden" card with a "Back to home" link.
- `/login` is unauthenticated; everything else (`/`, `/leads`, `/dashboard`, `/users`) goes inside `RequireAuth`.
- `api/client.ts` 401 handler: dispatches `window.dispatchEvent(new CustomEvent('auth:unauthorized'))` BEFORE throwing `ApiError`; `AuthProvider` listens and calls `logout()`.
- `AppShell` shows "Login" link when anon, or "{user.fullName} · Logout" when authed.
- Vitest tests cover: provider boots anon when no token, provider hydrates on existing token, login success path, login failure path (401, 429), RequireAuth redirect, RequireRole 403 view.

**Prerequisites**: 1.2 (api/client.ts, AppShell, router), 1.4 (HomePage exists at `/`), 2.2 (BE endpoints).

**Context**:
- `frontend/src/api/client.ts` (1.2 — modify).
- `frontend/src/App.tsx`, `frontend/src/router.tsx` (1.2 — modify).
- `frontend/src/ui/AppShell.tsx` (1.2 — modify).

**Patterns**: Auth via context (the only context allowed per § 7.3); TanStack Query for `me` hydration (§ 7.2); routing wrappers (§ 7.4).

**Steps**:

1. **Shared types** — `frontend/src/types/index.ts`:
   ```ts
   export interface User { id: number; email: string; fullName: string; role: 'admin' | 'sales'; active: boolean; }
   ```

2. **Patch `api/client.ts`** — 401 dispatcher:
   ```ts
   // Inside the !res.ok branch, before throwing:
   if (res.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'));
   ```

3. **Auth API hooks** — `frontend/src/features/auth/api.ts`:
   ```ts
   import { api } from '@/api/client';
   import type { User } from '@/types';
   export type LoginInput = { email: string; password: string };
   export type LoginResponse = { token: string; user: User };
   export const authApi = {
     login: (input: LoginInput) => api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input), auth: false }),
     me:    () => api<User>('/auth/me'),
   };
   ```

4. **AuthProvider** — `frontend/src/features/auth/AuthProvider.tsx`:
   ```tsx
   import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
   import { useQueryClient } from '@tanstack/react-query';
   import { authApi } from './api';
   import type { User } from '@/types';

   type Status = 'loading' | 'authed' | 'anon';
   interface AuthCtx { user: User | null; status: Status; login: (e: string, p: string) => Promise<void>; logout: () => void; }
   const Ctx = createContext<AuthCtx | null>(null);
   const KEY = 'mvp-crm-token';

   export function AuthProvider({ children }: { children: ReactNode }) {
     const [user, setUser] = useState<User | null>(null);
     const [status, setStatus] = useState<Status>(localStorage.getItem(KEY) ? 'loading' : 'anon');
     const qc = useQueryClient();

     useEffect(() => {
       if (status !== 'loading') return;
       authApi.me().then((u) => { setUser(u); setStatus('authed'); })
         .catch(() => { localStorage.removeItem(KEY); setUser(null); setStatus('anon'); });
     }, [status]);

     useEffect(() => {
       const onUnauth = () => { localStorage.removeItem(KEY); setUser(null); setStatus('anon'); qc.clear(); };
       window.addEventListener('auth:unauthorized', onUnauth);
       return () => window.removeEventListener('auth:unauthorized', onUnauth);
     }, [qc]);

     const login = async (email: string, password: string) => {
       const r = await authApi.login({ email, password });
       localStorage.setItem(KEY, r.token);
       setUser(r.user);
       setStatus('authed');
     };
     const logout = () => { localStorage.removeItem(KEY); setUser(null); setStatus('anon'); qc.clear(); };

     return <Ctx.Provider value={{ user, status, login, logout }}>{children}</Ctx.Provider>;
   }
   export function useAuth() {
     const v = useContext(Ctx);
     if (!v) throw new Error('useAuth must be inside AuthProvider');
     return v;
   }
   ```

5. **useAuth hook re-export** — `frontend/src/features/auth/useAuth.ts`:
   ```ts
   export { useAuth } from './AuthProvider';
   ```

6. **LoginPage** — `frontend/src/features/auth/LoginPage.tsx`:
   ```tsx
   import { useState, type FormEvent } from 'react';
   import { Navigate, useLocation, useNavigate } from 'react-router-dom';
   import { Card } from '@/ui/Card';
   import { Button } from '@/ui/Button';
   import { useAuth } from './AuthProvider';
   import { ApiError } from '@/api/client';

   export function LoginPage() {
     const { status, login } = useAuth();
     const loc = useLocation();
     const nav = useNavigate();
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [err, setErr] = useState<string | null>(null);
     const [pending, setPending] = useState(false);

     if (status === 'authed') return <Navigate to={new URLSearchParams(loc.search).get('next') ?? '/'} replace />;

     const onSubmit = async (e: FormEvent) => {
       e.preventDefault();
       setErr(null); setPending(true);
       try {
         await login(email, password);
         nav(new URLSearchParams(loc.search).get('next') ?? '/', { replace: true });
       } catch (ex) {
         if (ex instanceof ApiError && ex.status === 429) setErr('Too many attempts. Try again in 15 minutes.');
         else setErr('Invalid email or password');
       } finally { setPending(false); }
     };

     return (
       <div className="max-w-md mx-auto mt-12">
         <Card>
           <h1 className="text-2xl font-bold mb-4">Sign in to Mvp-CRM</h1>
           <form onSubmit={onSubmit} className="space-y-4" noValidate>
             <label className="block">
               <span className="text-sm font-semibold">Email</span>
               <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" autoComplete="email" />
             </label>
             <label className="block">
               <span className="text-sm font-semibold">Password</span>
               <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" autoComplete="current-password" />
             </label>
             {err && <p role="alert" className="text-sm text-danger">{err}</p>}
             <Button type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</Button>
           </form>
         </Card>
       </div>
     );
   }
   ```

7. **RequireAuth / RequireRole** — `frontend/src/features/auth/RequireAuth.tsx`, `RequireRole.tsx`:
   ```tsx
   // RequireAuth.tsx
   import { Navigate, Outlet, useLocation } from 'react-router-dom';
   import { useAuth } from './AuthProvider';

   export function RequireAuth() {
     const { status } = useAuth();
     const loc = useLocation();
     if (status === 'loading') return <div className="p-12 text-center text-gray-500">Loading…</div>;
     if (status === 'anon')    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
     return <Outlet />;
   }
   ```
   ```tsx
   // RequireRole.tsx
   import type { ReactNode } from 'react';
   import { Link } from 'react-router-dom';
   import { Card } from '@/ui/Card';
   import { useAuth } from './AuthProvider';

   export function RequireRole({ role, children }: { role: 'admin' | 'sales'; children: ReactNode }) {
     const { user } = useAuth();
     if (user?.role !== role) {
       return (
         <Card>
           <h2 className="text-xl font-bold">403 — Forbidden</h2>
           <p className="text-gray-600 mt-2">You don't have access to this page.</p>
           <Link to="/" className="text-brand underline mt-4 inline-block">Back to home</Link>
         </Card>
       );
     }
     return <>{children}</>;
   }
   ```

8. **Patch `App.tsx` and `router.tsx`** — wrap with AuthProvider, restructure routes:
   ```tsx
   // App.tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { RouterProvider } from 'react-router-dom';
   import { AuthProvider } from './features/auth/AuthProvider';
   import { router } from './router';

   const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
   export function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <AuthProvider>
           <RouterProvider router={router} />
         </AuthProvider>
       </QueryClientProvider>
     );
   }
   ```
   ```tsx
   // router.tsx
   import { createBrowserRouter } from 'react-router-dom';
   import { AppShell } from './ui/AppShell';
   import { HomePage } from './features/_home/HomePage';
   import { LoginPage } from './features/auth/LoginPage';
   import { RequireAuth } from './features/auth/RequireAuth';

   export const router = createBrowserRouter([
     { path: '/login', element: <LoginPage /> },
     { path: '/', element: <RequireAuth />, children: [
       { index: true, element: <AppShell><HomePage /></AppShell> },
     ]},
   ]);
   ```

9. **Patch `AppShell`** — add user/login slot (shared file):
   ```tsx
   // Inside <nav> of AppShell.tsx
   import { Link } from 'react-router-dom';
   import { useAuth } from '@/features/auth/useAuth';
   // ...
   const { user, status, logout } = useAuth();
   // ...replace nav contents:
   {status === 'authed' && user ? (
     <>
       <span className="text-gray-700">{user.fullName}</span>
       <button onClick={logout} className="text-brand hover:underline">Logout</button>
     </>
   ) : (
     <Link to="/login" className="text-brand hover:underline">Login</Link>
   )}
   ```

**Tests**:

```tsx
// frontend/src/features/auth/AuthProvider.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthProvider';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());

function Probe() { const a = useAuth(); return <div data-testid="status">{a.status}-{a.user?.email ?? 'none'}</div>; }
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>;
}

describe('AuthProvider', () => {
  it('boots anon when no token', () => {
    render(wrap(<Probe />));
    expect(screen.getByTestId('status').textContent).toBe('anon-none');
  });
  it('hydrates from a stored token', async () => {
    localStorage.setItem('mvp-crm-token', 'tok');
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ id: 1, email: 'a@x', fullName: 'A', role: 'sales', active: true })));
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authed-a@x'));
  });
  it('falls back to anon on 401 during hydrate', async () => {
    localStorage.setItem('mvp-crm-token', 'bad');
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401 })));
    render(wrap(<Probe />));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anon-none'));
    expect(localStorage.getItem('mvp-crm-token')).toBeNull();
  });
});
```

Manual tests:
- `/login` shows the form when anon.
- Submit with seeded Admin creds → redirected to `/`, AppShell shows name + Logout.
- Refresh browser → still authed.
- Logout → back to `/login`, localStorage cleared.
- Bad credentials → inline "Invalid email or password".
- 6 failed attempts → "Too many attempts…".
- Visit `/leads` (will redirect via RequireAuth in this story — leads page comes later; verify the redirect lands on `/login?next=%2Fleads`).

**Quality**: ESLint 0; Vitest passes; coverage ≥85%; no `useEffect` for fetch in `LoginPage`; only the auth `useEffect`s in `AuthProvider` (context boot + event listener) are allowed.

**OUT**:
- ❌ Password reset / forgot password — explicit OUT.
- ❌ Refresh-token rotation — explicit OUT.
- ❌ Social login (Google, etc.) — explicit OUT.
- ❌ Remember-me / token TTL toggles — JWT TTL is server-fixed (24h).
- ❌ Auth integration tests at the FE level — Story 2.4.

**Evidence**: Screenshots of login form, login failure inline error, post-login home page with name + Logout. Vitest output for AuthProvider tests.
