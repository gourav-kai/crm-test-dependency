### Story 1.4: Connect FE to BE (Health Check on Home Page)

**Epic**: 1 - PROJECT FOUNDATION | **ID**: 1.4 | **Date**: 2026-05-19 | **GitHub**: #4
**Requires**: [1.1, 1.2, 1.3]
**Enables**: [2.3]
**Files Touched**:
  - backend/src/features/_health/health.service.ts
  - backend/src/features/_health/health.routes.ts
  - frontend/src/features/_home/HomePage.tsx
  - frontend/src/features/_home/api.ts
  - frontend/src/router.tsx
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- Story 1.1 — `health.routes.ts` (existing).
- Story 1.2 — `api/client.ts`, `AppShell.tsx`, router structure.
- Story 1.3 — `db/client.ts` (used by health service).

**Description**:
Closes the walking-skeleton loop. Upgrades `/api/health` from a static `{ok:true}` into a real check that also pings the SQLite DB (`SELECT 1`) and reports both subsystems in a structured response. Adds a frontend `HomePage` that calls `/api/health` via TanStack Query on mount and renders two status pills (Backend, Database) — green when the call succeeds, red on network error, with a retry button. This is the first user-visible page and the first proof that all three foundation pieces (BE, FE, DB) work together.

**Acceptance Criteria**:
- `GET /api/health` returns `200 { ok: true, backend: 'ok', db: 'ok' }` when DB is reachable.
- If the DB `SELECT 1` throws, the route returns `503 { ok: false, backend: 'ok', db: 'down' }` (still inside the error envelope rules — but health is intentionally a custom shape so monitoring can read it).
- Health route does NOT require auth.
- Frontend `/` route renders `HomePage` (replaces the placeholder from 1.2).
- HomePage shows: "Mvp-CRM" headline, a `Card` with two `StatusPill`s ("Backend" + "Database"), and a "Retry" button when the call fails.
- On page load, `useHealth()` TanStack Query hook fires `GET /api/health`; while loading, pills show neutral/grey "Checking…" state.
- On success → green pills, label "Connected".
- On network error → red pills, label "Disconnected", Retry button visible; clicking Retry re-invokes the query.
- ESLint clean; Vitest passes; coverage ≥85% on changed files.
- The HomePage test renders, asserts pills, and asserts query is fired.

**Prerequisites**: 1.1, 1.2, 1.3 all merged and running locally.

**Context**:
- `backend/src/features/_health/health.routes.ts` (1.1).
- `backend/src/db/client.ts` (1.3).
- `frontend/src/api/client.ts`, `frontend/src/router.tsx` (1.2).

**Patterns**: TanStack Query hook per feature (§7.2), component receives data via hooks (§7.3), no `useEffect` for fetching (§7.3), error envelope handled by `ApiError` from `api/client.ts`.

**Steps**:

1. **Health service** — `backend/src/features/_health/health.service.ts`:
   ```ts
   import { db } from '@/db/client';

   export function checkHealth(): { ok: true; backend: 'ok'; db: 'ok' } | { ok: false; backend: 'ok'; db: 'down' } {
     try {
       db.prepare('SELECT 1').get();
       return { ok: true, backend: 'ok', db: 'ok' };
     } catch {
       return { ok: false, backend: 'ok', db: 'down' };
     }
   }
   ```

2. **Update health route** — `backend/src/features/_health/health.routes.ts`:
   ```ts
   import { Router } from 'express';
   import { checkHealth } from './health.service';

   export const healthRouter = Router();
   healthRouter.get('/', (_req, res) => {
     const body = checkHealth();
     res.status(body.ok ? 200 : 503).json(body);
   });
   ```

3. **Frontend api hook** — `frontend/src/features/_home/api.ts`:
   ```ts
   import { useQuery } from '@tanstack/react-query';
   import { api } from '@/api/client';

   export type HealthBody =
     | { ok: true; backend: 'ok'; db: 'ok' }
     | { ok: false; backend: 'ok'; db: 'down' };

   export function useHealth() {
     return useQuery({
       queryKey: ['health'] as const,
       queryFn: () => api<HealthBody>('/health', { auth: false }),
       retry: 0,
     });
   }
   ```

4. **HomePage** — `frontend/src/features/_home/HomePage.tsx`:
   ```tsx
   import { Card } from '@/ui/Card';
   import { Button } from '@/ui/Button';
   import { useHealth } from './api';

   function StatusPill({ label, state }: { label: string; state: 'loading' | 'ok' | 'down' }) {
     const color =
       state === 'ok'   ? 'bg-green-100 text-green-800'
     : state === 'down' ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700';
     const text =
       state === 'ok'   ? 'Connected'
     : state === 'down' ? 'Disconnected'
                        : 'Checking…';
     return (
       <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${color}`}>
         <span className="font-semibold">{label}:</span> {text}
       </span>
     );
   }

   export function HomePage() {
     const { data, isError, isFetching, refetch } = useHealth();
     const backend = isFetching ? 'loading' : isError ? 'down' : 'ok';
     const dbState = isFetching ? 'loading' : isError || data?.db !== 'ok' ? 'down' : 'ok';
     return (
       <div className="space-y-6">
         <h1 className="text-3xl font-bold">Mvp-CRM</h1>
         <Card className="flex flex-wrap gap-3 items-center">
           <StatusPill label="Backend" state={backend} />
           <StatusPill label="Database" state={dbState} />
           {(isError || data?.ok === false) && (
             <Button variant="ghost" onClick={() => refetch()} aria-label="Retry health check">
               Retry
             </Button>
           )}
         </Card>
       </div>
     );
   }
   ```

5. **Mount in router** — patch `frontend/src/router.tsx`:
   ```tsx
   import { createBrowserRouter } from 'react-router-dom';
   import { AppShell } from './ui/AppShell';
   import { HomePage } from './features/_home/HomePage';

   export const router = createBrowserRouter([
     { path: '/', element: <AppShell><HomePage /></AppShell> },
   ]);
   ```

**Tests**:

```tsx
// frontend/src/features/_home/HomePage.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { HomePage } from './HomePage';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('HomePage', () => {
  it('shows Connected pills when health returns ok', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ ok: true, backend: 'ok', db: 'ok' })));
    render(wrap(<HomePage />));
    await waitFor(() => expect(screen.getAllByText(/Connected/)).toHaveLength(2));
  });

  it('shows Disconnected + Retry when network errors', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    render(wrap(<HomePage />));
    await waitFor(() => expect(screen.getAllByText(/Disconnected/)).toHaveLength(2));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
```

```ts
// backend/src/features/_health/health.routes.test.ts (extends 1.1's test)
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { buildApp } from '@/app';

describe('GET /api/health (with DB)', () => {
  it('returns ok+db when DB reachable', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, backend: 'ok', db: 'ok' });
  });
});
```

*Note*: add `msw: ^2.4.0` to `frontend/package.json` devDependencies if not already present (shared file).

Manual tests:
- `npm run dev` from root → backend on 4000, frontend on 5173.
- Visit `http://localhost:5173/` → both pills green within ~1s.
- Stop backend (`Ctrl-C` on the BE process) → click Retry → pills go red.
- Re-start backend → click Retry → pills go green.

**Quality**: ESLint 0; Prettier clean; Vitest passes; coverage ≥85%; no `useEffect` for fetch.

**OUT**:
- ❌ Authenticated landing — Epic 2.
- ❌ Real-time health (WebSocket) — out of scope.
- ❌ Per-subsystem latency metrics — out of scope.
- ❌ Adding nav links to AppShell — feature stories own that.

**Evidence**: Screenshot of green pills, screenshot of red pills with Retry, Vitest output.
