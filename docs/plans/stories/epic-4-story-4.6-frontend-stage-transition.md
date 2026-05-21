### Story 4.6: Frontend Stage Transition UI (LeadDetailPage + StageStepper)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.6 | **Date**: 2026-05-19 | **GitHub**: #17
**Requires**: [4.5]
**Enables**: []
**Files Touched**:
  - frontend/src/features/leads/LeadDetailPage.tsx
  - frontend/src/features/leads/StageStepper.tsx
  - frontend/src/features/leads/api.ts
  - frontend/src/features/leads/LeadDetailPage.test.tsx
  - frontend/src/router.tsx
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 7 (Frontend Patterns).
- Story 4.3 (`POST /api/leads/:id/stage`).
- Story 4.5 (edit + detail flow).

**Description**:
Closes Epic 4 with the detail view at `/leads/:id`. Shows all lead fields (read-only) plus a `StageStepper` that lets the user transition the lead between stages via `POST /api/leads/:id/stage`. The stepper uses optimistic UI: clicking a stage immediately updates the visual selection, fires the mutation, and rolls back on error. Adds "Edit" (→ `/leads/:id/edit`) and "Delete" buttons; delete asks for confirmation, then `DELETE /api/leads/:id` → navigates to `/leads`.

**Acceptance Criteria**:
- `/leads/:id` renders `LeadDetailPage` inside `RequireAuth` + `AppShell`.
- Page fetches via `useLead(id)`; loading state, 404 state ("Lead not found" + back link), error state.
- Top section: opportunityName as title, stage badge, contactPerson, est. closing date, lead value ($), updated at, owner id (admin sees owner name if available).
- `StageStepper`: 4-item horizontal stepper (Evaluating → Proposing → Solutioning → Complete). Click any pill → mutate.
- Optimistic update: clicking a stage immediately reflects in the UI; on success leaves it; on failure reverts + toast/banner.
- Mutation invalidates `leadsKeys.all` AND `leadsKeys.detail(id)` on success.
- "Edit" button → `/leads/:id/edit`.
- "Delete" button → confirms via `window.confirm` ("Delete this lead? This cannot be undone."), then `DELETE` → navigate `/leads`; on error → banner.
- "Notes" rendered as preserved-whitespace plain text (`whitespace-pre-wrap`); no HTML rendering.
- Vitest covers: render, stage click happy, stage click failure rollback, delete confirm + navigate.

**Prerequisites**: 4.5 (api.ts), 4.3 (BE endpoints).

**Context**: `frontend/src/features/leads/api.ts`, types.

**Patterns**: TanStack optimistic mutation (`onMutate` + `onError` rollback) (§ 7.2); plain text notes — no `dangerouslySetInnerHTML` (§ Anti-patterns).

**Steps**:

1. **Extend api.ts** — add `useUpdateStage`, `useDeleteLead`:
   ```ts
   export function useUpdateStage(id: number) {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (stage: Lead['stage']) => api<Lead>(`/leads/${id}/stage`, { method: 'POST', body: JSON.stringify({ stage }) }),
       onMutate: async (stage) => {
         await qc.cancelQueries({ queryKey: leadsKeys.detail(id) });
         const prev = qc.getQueryData<Lead>(leadsKeys.detail(id));
         if (prev) qc.setQueryData<Lead>(leadsKeys.detail(id), { ...prev, stage });
         return { prev };
       },
       onError: (_e, _s, ctx) => { if (ctx?.prev) qc.setQueryData(leadsKeys.detail(id), ctx.prev); },
       onSettled: () => {
         qc.invalidateQueries({ queryKey: leadsKeys.all });
         qc.invalidateQueries({ queryKey: leadsKeys.detail(id) });
       },
     });
   }

   export function useDeleteLead(id: number) {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: () => api<{ ok: true }>(`/leads/${id}`, { method: 'DELETE' }),
       onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
     });
   }
   ```

2. **StageStepper** — `frontend/src/features/leads/StageStepper.tsx`:
   ```tsx
   import type { Stage } from '@/types';
   import { STAGES } from '@/types';

   export function StageStepper({ value, onChange, disabled }: { value: Stage; onChange: (s: Stage) => void; disabled?: boolean }) {
     return (
       <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Stage">
         {STAGES.map((s) => {
           const active = s === value;
           return (
             <button key={s} role="radio" aria-checked={active} disabled={disabled} onClick={() => !active && onChange(s)}
                     className={`px-4 py-2 rounded-full text-sm border ${
                       active ? 'bg-brand text-white border-brand' : 'bg-white text-gray-700 border-gray-300 hover:border-brand'}`}>
               {s}
             </button>
           );
         })}
       </div>
     );
   }
   ```

3. **LeadDetailPage** — `frontend/src/features/leads/LeadDetailPage.tsx`:
   ```tsx
   import { useState } from 'react';
   import { Link, useNavigate, useParams } from 'react-router-dom';
   import { Card } from '@/ui/Card';
   import { Button } from '@/ui/Button';
   import { ApiError } from '@/api/client';
   import { useLead, useUpdateStage, useDeleteLead } from './api';
   import { StageStepper } from './StageStepper';

   const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

   export function LeadDetailPage() {
     const { id } = useParams<{ id: string }>();
     const leadId = Number(id);
     const nav = useNavigate();
     const lead = useLead(leadId);
     const stage = useUpdateStage(leadId);
     const del   = useDeleteLead(leadId);
     const [banner, setBanner] = useState<string | null>(null);

     if (lead.error instanceof ApiError && lead.error.status === 404) {
       return <Card><p>Lead not found.</p><Link to="/leads" className="text-brand underline">Back to leads</Link></Card>;
     }
     if (lead.isLoading || !lead.data) return <p>Loading…</p>;

     const l = lead.data;
     const onStage = async (s: typeof l.stage) => {
       setBanner(null);
       try { await stage.mutateAsync(s); }
       catch { setBanner('Could not update stage. Reverted.'); }
     };
     const onDelete = async () => {
       if (!window.confirm('Delete this lead? This cannot be undone.')) return;
       try { await del.mutateAsync(); nav('/leads'); }
       catch { setBanner('Could not delete the lead.'); }
     };

     return (
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-bold">{l.opportunityName}</h1>
           <div className="flex gap-2">
             <Link to={`/leads/${l.id}/edit`}><Button variant="ghost">Edit</Button></Link>
             <Button variant="ghost" onClick={onDelete} className="text-danger">Delete</Button>
           </div>
         </div>
         {banner && <Card className="border-danger"><p role="alert" className="text-danger">{banner}</p></Card>}
         <Card className="space-y-3">
           <div><span className="font-semibold">Stage:</span></div>
           <StageStepper value={l.stage} onChange={onStage} disabled={stage.isPending} />
           <dl className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
             <div><dt className="text-gray-500">Contact</dt><dd>{l.contactPerson}</dd></div>
             <div><dt className="text-gray-500">Lead value</dt><dd>{fmtMoney(l.leadValue)}</dd></div>
             <div><dt className="text-gray-500">Est. closing</dt><dd>{new Date(l.estimatedClosingDate).toLocaleDateString()}</dd></div>
             <div><dt className="text-gray-500">Last updated</dt><dd>{new Date(l.updatedAt).toLocaleString()}</dd></div>
             <div className="col-span-2"><dt className="text-gray-500">Notes</dt>
               <dd className="whitespace-pre-wrap">{l.notes || <span className="text-gray-400">(none)</span>}</dd></div>
           </dl>
         </Card>
       </div>
     );
   }
   ```

4. **Mount route** — patch `router.tsx`:
   ```tsx
   import { LeadDetailPage } from './features/leads/LeadDetailPage';
   { path: 'leads/:id', element: <AppShell><LeadDetailPage /></AppShell> },
   ```

**Tests** — `frontend/src/features/leads/LeadDetailPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LeadDetailPage } from './LeadDetailPage';
import { defaultAuthHandlers } from '@/test/handlers';

const sample = { id: 1, opportunityName: 'Acme', contactPerson: 'Jane', stage: 'Evaluating',
  estimatedClosingDate: '2026-12-01', leadValue: 5000, ownerId: 1, notes: 'hello',
  createdAt: '', updatedAt: '2026-05-19T00:00:00Z' };

const server = setupServer(...defaultAuthHandlers,
  http.get('/api/leads/1', () => HttpResponse.json(sample)),
);
beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(...defaultAuthHandlers, http.get('/api/leads/1', () => HttpResponse.json(sample))); localStorage.clear(); });
afterAll(() => server.close());

function wrap(initial = '/leads/1') {
  localStorage.setItem('mvp-crm-token', 'fake-jwt');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}><AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/leads" element={<div>LIST</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider></QueryClientProvider>
  );
}

describe('LeadDetailPage', () => {
  it('renders lead + StageStepper', async () => {
    render(wrap());
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Evaluating' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves stage on click (optimistic)', async () => {
    server.use(http.post('/api/leads/1/stage', async () => HttpResponse.json({ ...sample, stage: 'Proposing' })));
    const u = userEvent.setup();
    render(wrap());
    await u.click(await screen.findByRole('radio', { name: 'Proposing' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Proposing' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('rolls back stage on server error', async () => {
    server.use(http.post('/api/leads/1/stage', () => HttpResponse.json({ error: { code: 'X', message: 'fail' } }, { status: 500 })));
    const u = userEvent.setup();
    render(wrap());
    await u.click(await screen.findByRole('radio', { name: 'Solutioning' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Reverted/i);
    expect(screen.getByRole('radio', { name: 'Evaluating' })).toHaveAttribute('aria-checked', 'true');
  });
});
```

Manual tests:
- Click a lead from `/leads` → detail page.
- Click "Proposing" → instant visual switch; backend returns 200 → stays selected; list page now shows Proposing.
- Force a 500 (e.g., temporarily break the SQL) → rollback to previous stage + alert.
- Click "Edit" → form prefilled.
- Click "Delete" → confirm → returns to `/leads` without the lead.
- Cross-rep direct URL `/leads/<bob's lead id>` as Alice → "Lead not found".

**Quality**: ESLint 0; Vitest passes; coverage ≥85%; no `dangerouslySetInnerHTML`; `whitespace-pre-wrap` used for notes.

**OUT**:
- ❌ Activity timeline (call logs, meetings) — explicit OUT per requirements.
- ❌ Audit log of stage changes — out of scope.
- ❌ File attachments — explicit OUT.
- ❌ Comments / @-mentions — out of scope.
- ❌ Permission to change owner — out of scope.

**Evidence**: Screenshots of detail page, stepper, delete confirm, rollback alert. Vitest output.
