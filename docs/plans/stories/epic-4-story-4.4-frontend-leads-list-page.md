### Story 4.4: Frontend LeadsListPage (Filter, Search, Role-Aware Columns)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.4 | **Date**: 2026-05-19 | **GitHub**: #15
**Requires**: [2.3, 4.3]
**Enables**: [4.5]
**Files Touched**:
  - frontend/src/features/leads/LeadsListPage.tsx
  - frontend/src/features/leads/LeadsTable.tsx
  - frontend/src/features/leads/LeadFilters.tsx
  - frontend/src/features/leads/api.ts
  - frontend/src/features/leads/LeadsListPage.test.tsx
  - frontend/src/router.tsx
  - frontend/src/ui/AppShell.tsx
  - frontend/src/types/index.ts
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 7 (Frontend Patterns).
- Story 4.3 (BE contract).
- Story 2.3 (auth, RequireAuth).

**Description**:
First customer-facing leads page at `/leads`. Lists leads via `GET /api/leads`, with a stage filter dropdown and a debounced text search box that hit the server-side query params. Adds an "Owner" column visible only to Admin. "New lead" button routes to `/leads/new` (page implemented in Story 4.5). Rows are clickable → `/leads/:id` (page in Story 4.6). Adds a "Leads" nav link to AppShell (every authed user).

**Acceptance Criteria**:
- `/leads` route (inside `RequireAuth`) shows `LeadsListPage`.
- AppShell shows "Leads" nav link for any authed user.
- `useLeads({ stage, search })` calls `GET /api/leads?stage=&search=` and caches under `leadsKeys.list({stage,search})`.
- Search box is debounced 300ms before triggering a new query.
- Empty state: "No leads yet — click '+ New lead' to add one." with CTA.
- Loading state: skeleton rows (4 placeholder rows).
- Error state: red banner "Could not load leads. Retry?"; Retry button refetches.
- Columns: Opportunity, Contact, Stage badge, Value (formatted as `$1,234.50`), Est. Close, Updated. Admin sees an additional "Owner" column.
- Rows are `<Link>` to `/leads/:id` — but the "Edit" button per row goes to `/leads/:id/edit` (or, simpler: a single click navigates; "Edit" handled in 4.5).
- "+ New lead" button routes to `/leads/new`.
- Filter dropdown: All / Evaluating / Proposing / Solutioning / Complete.
- Vitest: list renders rows, search debounces, admin sees Owner column, empty state shown when API returns `[]`.

**Prerequisites**: 2.3 (auth context), 4.3 (BE endpoint).

**Context**: `frontend/src/api/client.ts`, `frontend/src/features/auth/*`, `frontend/src/types/index.ts`.

**Patterns**: TanStack Query (§ 7.2); feature folder (§ 1.1); no `useEffect` for data (§ 7.3); debounce via setTimeout in a `useEffect` is the one allowed exception when implementing client-side input timing (kept inside the component, no fetch in effect).

**Steps**:

1. **Extend `types/index.ts`** (shared):
   ```ts
   export type Stage = 'Evaluating' | 'Proposing' | 'Solutioning' | 'Complete';
   export const STAGES: Stage[] = ['Evaluating', 'Proposing', 'Solutioning', 'Complete'];

   export interface Lead {
     id: number;
     opportunityName: string;
     notes: string | null;
     contactPerson: string;
     estimatedClosingDate: string;
     leadValue: number;
     stage: Stage;
     ownerId: number;
     createdAt: string;
     updatedAt: string;
   }
   ```

2. **API hooks** — `frontend/src/features/leads/api.ts`:
   ```ts
   import { useQuery } from '@tanstack/react-query';
   import { api } from '@/api/client';
   import type { Lead, Stage } from '@/types';

   export type ListFilter = { stage?: Stage; search?: string };

   export const leadsKeys = {
     all: ['leads'] as const,
     list: (f: ListFilter) => [...leadsKeys.all, 'list', f] as const,
     detail: (id: number) => [...leadsKeys.all, 'detail', id] as const,
   };

   export function useLeads(f: ListFilter) {
     const params = new URLSearchParams();
     if (f.stage)  params.set('stage', f.stage);
     if (f.search) params.set('search', f.search);
     const qs = params.toString();
     return useQuery({
       queryKey: leadsKeys.list(f),
       queryFn: () => api<Lead[]>(`/leads${qs ? '?' + qs : ''}`),
       staleTime: 30_000,
     });
   }
   ```

3. **Filters component** — `frontend/src/features/leads/LeadFilters.tsx`:
   ```tsx
   import { useEffect, useState } from 'react';
   import type { Stage } from '@/types';
   import { STAGES } from '@/types';

   export function LeadFilters({ value, onChange }: {
     value: { stage?: Stage; search?: string };
     onChange: (next: { stage?: Stage; search?: string }) => void;
   }) {
     const [search, setSearch] = useState(value.search ?? '');
     useEffect(() => {
       const t = setTimeout(() => onChange({ ...value, search: search.trim() || undefined }), 300);
       return () => clearTimeout(t);
     }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

     return (
       <div className="flex gap-3 items-center">
         <select
           value={value.stage ?? ''}
           onChange={(e) => onChange({ ...value, stage: (e.target.value || undefined) as Stage | undefined })}
           className="rounded-md border-gray-300 px-3 py-2 border text-sm"
           aria-label="Filter by stage"
         >
           <option value="">All stages</option>
           {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
         </select>
         <input
           type="search"
           placeholder="Search opportunity…"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
           className="rounded-md border-gray-300 px-3 py-2 border text-sm w-64"
           aria-label="Search opportunity"
         />
       </div>
     );
   }
   ```

4. **Table component** — `frontend/src/features/leads/LeadsTable.tsx`:
   ```tsx
   import { Link } from 'react-router-dom';
   import type { Lead } from '@/types';
   import { useAuth } from '@/features/auth/useAuth';

   const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
   const fmtDate  = (s: string) => new Date(s).toLocaleDateString();

   const stageColor: Record<string, string> = {
     Evaluating: 'bg-gray-200 text-gray-800',
     Proposing: 'bg-blue-100 text-blue-800',
     Solutioning: 'bg-amber-100 text-amber-800',
     Complete: 'bg-green-100 text-green-800',
   };

   export function LeadsTable({ leads, ownerNames }: { leads: Lead[]; ownerNames?: Record<number, string> }) {
     const { user } = useAuth();
     const showOwner = user?.role === 'admin';
     return (
       <table className="min-w-full bg-white border border-gray-200 rounded-md text-sm">
         <thead className="bg-gray-50 text-left">
           <tr>
             <th className="px-4 py-2 font-semibold">Opportunity</th>
             <th className="px-4 py-2 font-semibold">Contact</th>
             <th className="px-4 py-2 font-semibold">Stage</th>
             <th className="px-4 py-2 font-semibold">Value</th>
             <th className="px-4 py-2 font-semibold">Est. Close</th>
             <th className="px-4 py-2 font-semibold">Updated</th>
             {showOwner && <th className="px-4 py-2 font-semibold">Owner</th>}
           </tr>
         </thead>
         <tbody>
           {leads.map((l) => (
             <tr key={l.id} className="border-t hover:bg-gray-50">
               <td className="px-4 py-2"><Link to={`/leads/${l.id}`} className="text-brand hover:underline">{l.opportunityName}</Link></td>
               <td className="px-4 py-2">{l.contactPerson}</td>
               <td className="px-4 py-2">
                 <span className={`px-2 py-0.5 rounded-full text-xs ${stageColor[l.stage]}`}>{l.stage}</span>
               </td>
               <td className="px-4 py-2">{fmtMoney(l.leadValue)}</td>
               <td className="px-4 py-2">{fmtDate(l.estimatedClosingDate)}</td>
               <td className="px-4 py-2 text-gray-500">{fmtDate(l.updatedAt)}</td>
               {showOwner && <td className="px-4 py-2">{ownerNames?.[l.ownerId] ?? `#${l.ownerId}`}</td>}
             </tr>
           ))}
         </tbody>
       </table>
     );
   }
   ```

5. **Page** — `frontend/src/features/leads/LeadsListPage.tsx`:
   ```tsx
   import { useState } from 'react';
   import { Link } from 'react-router-dom';
   import { Button } from '@/ui/Button';
   import { Card } from '@/ui/Card';
   import { useAuth } from '@/features/auth/useAuth';
   import { useLeads, type ListFilter } from './api';
   import { LeadFilters } from './LeadFilters';
   import { LeadsTable } from './LeadsTable';

   export function LeadsListPage() {
     const [filter, setFilter] = useState<ListFilter>({});
     const { data, isLoading, isError, refetch } = useLeads(filter);
     const { user } = useAuth();

     return (
       <div className="space-y-4">
         <div className="flex items-center justify-between flex-wrap gap-3">
           <h1 className="text-2xl font-bold">Leads</h1>
           <Link to="/leads/new"><Button>+ New lead</Button></Link>
         </div>
         <LeadFilters value={filter} onChange={setFilter} />
         {isLoading && (
           <Card>
             {[1,2,3,4].map((i) => <div key={i} className="h-6 bg-gray-100 rounded my-2 animate-pulse" />)}
           </Card>
         )}
         {isError && (
           <Card className="border-danger">
             <p className="text-danger">Could not load leads.</p>
             <Button variant="ghost" onClick={() => refetch()} className="mt-2">Retry</Button>
           </Card>
         )}
         {!isLoading && !isError && (
           data && data.length > 0
             ? <LeadsTable leads={data} />
             : <Card><p className="text-gray-600">No leads yet — click "+ New lead" to add one.</p></Card>
         )}
       </div>
     );
   }
   ```

6. **Mount route + nav link** — patch `router.tsx`, `AppShell.tsx`:
   ```tsx
   // router.tsx — inside RequireAuth subtree:
   import { LeadsListPage } from './features/leads/LeadsListPage';
   { path: 'leads', element: <AppShell><LeadsListPage /></AppShell> },
   ```
   ```tsx
   // AppShell.tsx — add a NavLink visible when authed:
   {status === 'authed' && (
     <NavLink to="/leads" className={({ isActive }) => isActive ? 'text-brand font-semibold' : 'text-gray-700 hover:text-brand'}>Leads</NavLink>
   )}
   ```

**Tests** — `frontend/src/features/leads/LeadsListPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LeadsListPage } from './LeadsListPage';
import { defaultAuthHandlers } from '@/test/handlers';

const lead = (over = {}) => ({
  id: 1, opportunityName: 'Acme', contactPerson: 'Jane', stage: 'Evaluating',
  estimatedClosingDate: '2026-12-01', leadValue: 5000, ownerId: 1, notes: null,
  createdAt: '', updatedAt: '2026-05-19T00:00:00Z', ...over,
});

const server = setupServer(...defaultAuthHandlers);
beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(...defaultAuthHandlers); localStorage.clear(); });
afterAll(() => server.close());

function wrap(ui: React.ReactNode) {
  localStorage.setItem('mvp-crm-token', 'fake-jwt');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><AuthProvider><MemoryRouter>{ui}</MemoryRouter></AuthProvider></QueryClientProvider>;
}

describe('LeadsListPage', () => {
  it('renders rows from API', async () => {
    server.use(http.get('/api/leads', () => HttpResponse.json([lead(), lead({ id: 2, opportunityName: 'Globex' })])));
    render(wrap(<LeadsListPage />));
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('shows empty state when no leads', async () => {
    server.use(http.get('/api/leads', () => HttpResponse.json([])));
    render(wrap(<LeadsListPage />));
    expect(await screen.findByText(/No leads yet/i)).toBeInTheDocument();
  });

  it('debounces search input before fetching', async () => {
    let calls = 0;
    server.use(http.get('/api/leads', ({ request }) => { calls++; return HttpResponse.json([]); }));
    const u = userEvent.setup();
    render(wrap(<LeadsListPage />));
    await u.type(screen.getByLabelText(/search/i), 'acme');
    // We expect a single call after debounce, not one per keystroke
    await waitFor(() => expect(calls).toBeLessThanOrEqual(2));
  });
});
```

Manual tests:
- Login as Alice → click "Leads" → empty state.
- Click "+ New lead" → navigates to `/leads/new` (404-ish until Story 4.5).
- Have a lead via direct API: row appears.
- Type "acm" in search → after ~300ms, list filters to matches only.
- Choose stage dropdown → list narrows.
- Login as Admin → "Owner" column visible.
- Stop backend → error banner + Retry button → click Retry while down → still error.

**Quality**: ESLint 0; Vitest passes; coverage ≥85% on changed files; no unbounded re-renders (debounce keyed only on `search`).

**OUT**:
- ❌ Pagination — out of scope.
- ❌ Sorting columns — out of scope.
- ❌ Bulk select / actions — out of scope.
- ❌ Saved filters — out of scope.
- ❌ Owner name JOIN on backend (admin column shows `#id` for MVP if name not pre-fetched) — optional polish; if owners endpoint is available admin can fetch user names via `useUsers()` and pass `ownerNames` prop. Mark this as out of MVP, in unless trivial.

**Evidence**: Screenshots: empty state, populated list, search filtered, admin Owner column. Vitest output.
