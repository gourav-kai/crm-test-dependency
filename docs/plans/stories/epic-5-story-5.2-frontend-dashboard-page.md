### Story 5.2: Frontend DashboardPage (2 Recharts Bar Charts)

**Epic**: 5 - ANALYTICS DASHBOARD | **ID**: 5.2 | **Date**: 2026-05-19 | **GitHub**: #19
**Requires**: [2.3, 5.1]
**Enables**: []
**Files Touched**:
  - frontend/src/features/dashboard/DashboardPage.tsx
  - frontend/src/features/dashboard/LeadsPerPersonChart.tsx
  - frontend/src/features/dashboard/LeadsByStageChart.tsx
  - frontend/src/features/dashboard/api.ts
  - frontend/src/features/dashboard/DashboardPage.test.tsx
  - frontend/src/router.tsx
  - frontend/src/ui/AppShell.tsx
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Component Architecture (Browser), § DR-6.
- Story 5.1 (BE endpoint contracts).
- Story 2.3 (auth context).

**Description**:
Renders `/dashboard` with 2 Recharts bar charts: "Leads per Person" (x-axis = owner name, y = count) and "Leads by Stage" (x = stage, y = count). Both fetch live data via TanStack Query on every navigation (no caching beyond default `staleTime`). Empty state when both queries return zero data. Route is lazy-loaded (`React.lazy` + `Suspense`) to keep Recharts out of the initial bundle. Adds "Dashboard" link to AppShell for any authed user.

**Acceptance Criteria**:
- `/dashboard` route (inside `RequireAuth`) lazy-loads `DashboardPage`.
- AppShell shows "Dashboard" nav link for any authed user.
- Page calls `GET /api/analytics/leads-per-person` and `GET /api/analytics/leads-by-stage` in parallel.
- Loading state: 2 skeleton card placeholders.
- Error state: red banner with Retry, per chart card.
- Charts render with Recharts:
  - LeadsPerPersonChart: vertical `BarChart` with `XAxis dataKey="ownerName"`, `YAxis allowDecimals={false}`, `Bar dataKey="count" fill="#1976D2"`.
  - LeadsByStageChart: same, `dataKey="stage"`; stage order preserved.
- Empty state when both arrays sum to 0: "No leads yet — add a lead to see your pipeline analytics." card spanning both columns.
- Sales user sees their own scoped data; admin sees org-wide. (Validated by role-aware page header: "Pipeline Overview" for admin; "My Pipeline" for sales.)
- Vitest: renders charts when data present (via MSW), empty state when both empty, retry on error.
- Bundle: charts vendor chunk lazy-loaded (verify via `vite build` chunk listing).

**Prerequisites**: 2.3 (auth context), 5.1 (BE).

**Context**: `frontend/src/api/client.ts`, `frontend/src/features/auth/*`.

**Patterns**: TanStack Query per feature (§ 7.2); `React.lazy` for route chunking (DR-6); no `useEffect` for fetch.

**Steps**:

1. **Add deps** — `frontend/package.json` (shared): `recharts ^2.13`.

2. **API hooks** — `frontend/src/features/dashboard/api.ts`:
   ```ts
   import { useQuery } from '@tanstack/react-query';
   import { api } from '@/api/client';
   import type { Stage } from '@/types';

   export type LeadsPerPersonRow = { ownerId: number; ownerName: string; count: number };
   export type LeadsByStageRow   = { stage: Stage; count: number };

   export function useLeadsPerPerson() {
     return useQuery({ queryKey: ['analytics','leads-per-person'], queryFn: () => api<LeadsPerPersonRow[]>('/analytics/leads-per-person') });
   }
   export function useLeadsByStage() {
     return useQuery({ queryKey: ['analytics','leads-by-stage'],   queryFn: () => api<LeadsByStageRow[]>('/analytics/leads-by-stage') });
   }
   ```

3. **LeadsPerPersonChart** — `frontend/src/features/dashboard/LeadsPerPersonChart.tsx`:
   ```tsx
   import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
   import type { LeadsPerPersonRow } from './api';

   export function LeadsPerPersonChart({ data }: { data: LeadsPerPersonRow[] }) {
     return (
       <ResponsiveContainer width="100%" height={300}>
         <BarChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
           <CartesianGrid strokeDasharray="3 3" />
           <XAxis dataKey="ownerName" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" />
           <YAxis allowDecimals={false} />
           <Tooltip />
           <Bar dataKey="count" fill="#1976D2" radius={[4, 4, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     );
   }
   ```

4. **LeadsByStageChart** — `frontend/src/features/dashboard/LeadsByStageChart.tsx`:
   ```tsx
   import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
   import type { LeadsByStageRow } from './api';

   export function LeadsByStageChart({ data }: { data: LeadsByStageRow[] }) {
     return (
       <ResponsiveContainer width="100%" height={300}>
         <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
           <CartesianGrid strokeDasharray="3 3" />
           <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
           <YAxis allowDecimals={false} />
           <Tooltip />
           <Bar dataKey="count" fill="#1976D2" radius={[4, 4, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     );
   }
   ```

5. **DashboardPage** — `frontend/src/features/dashboard/DashboardPage.tsx`:
   ```tsx
   import { Card } from '@/ui/Card';
   import { Button } from '@/ui/Button';
   import { useAuth } from '@/features/auth/useAuth';
   import { useLeadsByStage, useLeadsPerPerson } from './api';
   import { LeadsPerPersonChart } from './LeadsPerPersonChart';
   import { LeadsByStageChart } from './LeadsByStageChart';

   export default function DashboardPage() {
     const { user } = useAuth();
     const per   = useLeadsPerPerson();
     const stage = useLeadsByStage();

     const totalCount = (per.data?.reduce((a, r) => a + r.count, 0) ?? 0) + (stage.data?.reduce((a, r) => a + r.count, 0) ?? 0);
     const isEmpty = !per.isLoading && !stage.isLoading && totalCount === 0;

     return (
       <div className="space-y-6">
         <h1 className="text-2xl font-bold">{user?.role === 'admin' ? 'Pipeline Overview' : 'My Pipeline'}</h1>

         {isEmpty ? (
           <Card><p className="text-gray-600">No leads yet — add a lead to see your pipeline analytics.</p></Card>
         ) : (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <Card>
               <h2 className="text-lg font-semibold mb-3">Leads per Person</h2>
               {per.isLoading && <div className="h-72 bg-gray-100 rounded animate-pulse" />}
               {per.isError && <RetryBanner onRetry={() => per.refetch()} />}
               {per.data && <LeadsPerPersonChart data={per.data} />}
             </Card>
             <Card>
               <h2 className="text-lg font-semibold mb-3">Leads by Stage</h2>
               {stage.isLoading && <div className="h-72 bg-gray-100 rounded animate-pulse" />}
               {stage.isError && <RetryBanner onRetry={() => stage.refetch()} />}
               {stage.data && <LeadsByStageChart data={stage.data} />}
             </Card>
           </div>
         )}
       </div>
     );
   }

   function RetryBanner({ onRetry }: { onRetry: () => void }) {
     return (
       <div className="space-y-2">
         <p role="alert" className="text-danger text-sm">Could not load chart data.</p>
         <Button variant="ghost" onClick={onRetry}>Retry</Button>
       </div>
     );
   }
   ```

6. **Lazy-mount route** — patch `router.tsx`:
   ```tsx
   import { lazy, Suspense } from 'react';
   const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
   // Inside RequireAuth subtree:
   { path: 'dashboard',
     element: <AppShell><Suspense fallback={<p>Loading dashboard…</p>}><DashboardPage /></Suspense></AppShell> },
   ```

7. **AppShell nav link** — patch (shared):
   ```tsx
   {status === 'authed' && (
     <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-brand font-semibold' : 'text-gray-700 hover:text-brand'}>Dashboard</NavLink>
   )}
   ```

**Tests** — `frontend/src/features/dashboard/DashboardPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import DashboardPage from './DashboardPage';
import { defaultAuthHandlers } from '@/test/handlers';

const server = setupServer(...defaultAuthHandlers);
beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(...defaultAuthHandlers); localStorage.clear(); });
afterAll(() => server.close());

function wrap(ui: React.ReactNode) {
  localStorage.setItem('mvp-crm-token', 'fake-jwt');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><AuthProvider><MemoryRouter>{ui}</MemoryRouter></AuthProvider></QueryClientProvider>;
}

describe('DashboardPage', () => {
  it('renders the empty state when no leads', async () => {
    server.use(
      http.get('/api/analytics/leads-per-person', () => HttpResponse.json([])),
      http.get('/api/analytics/leads-by-stage',   () => HttpResponse.json([
        { stage: 'Evaluating', count: 0 }, { stage: 'Proposing', count: 0 },
        { stage: 'Solutioning', count: 0 }, { stage: 'Complete', count: 0 },
      ])),
    );
    render(wrap(<DashboardPage />));
    expect(await screen.findByText(/No leads yet/i)).toBeInTheDocument();
  });

  it('renders charts when data present', async () => {
    server.use(
      http.get('/api/analytics/leads-per-person', () => HttpResponse.json([{ ownerId: 1, ownerName: 'Alice', count: 3 }])),
      http.get('/api/analytics/leads-by-stage',   () => HttpResponse.json([
        { stage: 'Evaluating', count: 2 }, { stage: 'Proposing', count: 1 },
        { stage: 'Solutioning', count: 0 }, { stage: 'Complete', count: 0 },
      ])),
    );
    render(wrap(<DashboardPage />));
    await waitFor(() => expect(screen.getByText(/Leads per Person/i)).toBeInTheDocument());
    expect(screen.getByText(/Leads by Stage/i)).toBeInTheDocument();
  });

  it('Retry refetches on error', async () => {
    let calls = 0;
    server.use(
      http.get('/api/analytics/leads-per-person', () => { calls++; return HttpResponse.json({ error: { code: 'X', message: 'x' } }, { status: 500 }); }),
      http.get('/api/analytics/leads-by-stage',   () => HttpResponse.json([{ stage: 'Evaluating', count: 1 }])),
    );
    const u = userEvent.setup();
    render(wrap(<DashboardPage />));
    const retry = await screen.findByRole('button', { name: /retry/i });
    await u.click(retry);
    await waitFor(() => expect(calls).toBeGreaterThan(1));
  });
});
```

Manual tests:
- Login as Admin with leads → `/dashboard` shows two charts with bars; admin header reads "Pipeline Overview".
- Login as Alice → header "My Pipeline"; "Leads per Person" shows one bar (Alice).
- No leads → empty state card.
- Stop backend → Retry banners per chart; restart + Retry → charts render.
- `vite build` → confirm `dashboard-*.js` chunk separate from main.

**Quality**: ESLint 0; Vitest passes; coverage ≥85%; no `useEffect` for fetch; lazy import verified.

**OUT**:
- ❌ Date range filter — out of scope.
- ❌ Time-series / trend lines — out of scope.
- ❌ Drill-down click into a chart bar — out of scope (consider adding link to filtered leads list post-MVP).
- ❌ Export chart as image — out of scope.
- ❌ Pre-aggregated cache / refresh polling — out of scope.

**Evidence**: Screenshots of both charts (admin view + sales view + empty state), Vitest output, `vite build` chunk listing showing lazy chunk.
