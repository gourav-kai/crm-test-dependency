### Story 4.5: Frontend LeadFormPage (Create + Edit, RHF + Zod)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.5 | **Date**: 2026-05-19 | **GitHub**: #16
**Requires**: [4.4]
**Enables**: [4.6]
**Files Touched**:
  - frontend/src/features/leads/LeadFormPage.tsx
  - frontend/src/features/leads/LeadForm.tsx
  - frontend/src/features/leads/schemas.ts
  - frontend/src/features/leads/api.ts
  - frontend/src/features/leads/LeadFormPage.test.tsx
  - frontend/src/router.tsx
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 7.3 (forms with RHF + Zod).
- Story 4.3 (`POST` / `PATCH /api/leads`).
- Story 4.4 (list page + key invalidation).

**Description**:
Two routes share one form component: `/leads/new` (create) and `/leads/:id/edit` (edit). RHF + Zod resolver; on submit POST or PATCH; on success invalidate `leadsKeys.all` and navigate back to `/leads`. Server 422 validation errors are mapped into field-level inline messages. The form's Zod schema mirrors the backend `LeadCreateSchema` so the contracts stay in lock-step (acknowledged manual mirror per patterns § 7.3).

**Acceptance Criteria**:
- `/leads/new` renders an empty `LeadForm`; submit → `POST /api/leads` → navigate to `/leads`.
- `/leads/:id/edit` fetches the lead via `useLead(id)`; pre-fills the form; submit → `PATCH /api/leads/:id` → navigate to `/leads/:id`.
- Form fields: opportunityName (text, required, min 1, max 200), contactPerson (text, required), estimatedClosingDate (date, required, must be ≥ today on create; relaxed on edit), leadValue (number, required, ≥ 0), notes (textarea, optional, max 5000).
- Client-side validation: shows inline messages on blur + on submit attempt.
- Server-side 422: maps `details` fields onto matching field errors; falls back to a form-level banner for unmapped issues.
- Server-side 404 on edit (lead missing or cross-rep): show full-page "Lead not found" with link back to `/leads`.
- Submit button disabled while pending.
- On success: TanStack `qc.invalidateQueries({ queryKey: leadsKeys.all })` so the list refreshes.
- Vitest covers: create happy, create validation error inline, edit prefill + happy, edit 404 fallback.

**Prerequisites**: 4.4 (list page + types + api.ts), 4.3 (BE contract).

**Context**: `frontend/src/features/leads/api.ts` (extend), `frontend/src/types/index.ts`.

**Patterns**: RHF + Zod (§ 7.3); useMutation + invalidate (§ 7.2); inline error mapping from `ApiError.details`.

**Steps**:

1. **Add deps** — `frontend/package.json` (shared file): `react-hook-form ^7.53`, `@hookform/resolvers ^3.9`, `zod ^3.23`.

2. **Schemas** — `frontend/src/features/leads/schemas.ts`:
   ```ts
   import { z } from 'zod';

   export const LeadFormSchema = z.object({
     opportunityName: z.string().min(1, 'Required').max(200),
     contactPerson:   z.string().min(1, 'Required').max(200),
     estimatedClosingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required date'),
     leadValue: z.coerce.number().nonnegative('Must be ≥ 0'),
     notes: z.string().max(5000).optional().or(z.literal('')),
   });
   export type LeadFormValues = z.infer<typeof LeadFormSchema>;
   ```

3. **Extend api.ts** — add detail/create/update/delete hooks:
   ```ts
   import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
   import type { Lead } from '@/types';
   import type { LeadFormValues } from './schemas';

   export function useLead(id: number | undefined) {
     return useQuery({
       enabled: typeof id === 'number' && !Number.isNaN(id),
       queryKey: leadsKeys.detail(id ?? 0),
       queryFn: () => api<Lead>(`/leads/${id}`),
     });
   }

   export function useCreateLead() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (input: LeadFormValues) => api<Lead>('/leads', { method: 'POST', body: JSON.stringify({ ...input, notes: input.notes || null }) }),
       onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
     });
   }

   export function useUpdateLead(id: number) {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (patch: Partial<LeadFormValues>) =>
         api<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ ...patch, notes: patch.notes ?? undefined }) }),
       onSuccess: () => {
         qc.invalidateQueries({ queryKey: leadsKeys.all });
         qc.invalidateQueries({ queryKey: leadsKeys.detail(id) });
       },
     });
   }
   ```

4. **LeadForm** — `frontend/src/features/leads/LeadForm.tsx`:
   ```tsx
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { Button } from '@/ui/Button';
   import { LeadFormSchema, type LeadFormValues } from './schemas';

   interface Props {
     defaultValues?: Partial<LeadFormValues>;
     submitLabel: string;
     pending: boolean;
     formError?: string;
     fieldErrors?: Partial<Record<keyof LeadFormValues, string>>;
     onSubmit: (values: LeadFormValues) => void;
     onCancel: () => void;
   }

   export function LeadForm({ defaultValues, submitLabel, pending, formError, fieldErrors, onSubmit, onCancel }: Props) {
     const { register, handleSubmit, formState: { errors } } = useForm<LeadFormValues>({
       resolver: zodResolver(LeadFormSchema),
       defaultValues: { opportunityName: '', contactPerson: '', estimatedClosingDate: '', leadValue: 0, notes: '', ...defaultValues },
     });

     const err = (k: keyof LeadFormValues) => errors[k]?.message ?? fieldErrors?.[k];

     return (
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
         {(['opportunityName','contactPerson'] as const).map((k) => (
           <label key={k} className="block">
             <span className="text-sm font-semibold">{k === 'opportunityName' ? 'Opportunity name' : 'Contact person'}</span>
             <input {...register(k)} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" />
             {err(k) && <p role="alert" className="text-xs text-danger">{err(k)}</p>}
           </label>
         ))}
         <label className="block">
           <span className="text-sm font-semibold">Estimated closing date</span>
           <input type="date" {...register('estimatedClosingDate')} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" />
           {err('estimatedClosingDate') && <p role="alert" className="text-xs text-danger">{err('estimatedClosingDate')}</p>}
         </label>
         <label className="block">
           <span className="text-sm font-semibold">Lead value ($)</span>
           <input type="number" step="0.01" min="0" {...register('leadValue')} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" />
           {err('leadValue') && <p role="alert" className="text-xs text-danger">{err('leadValue')}</p>}
         </label>
         <label className="block">
           <span className="text-sm font-semibold">Notes (optional)</span>
           <textarea {...register('notes')} rows={4} className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" />
         </label>
         {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
         <div className="flex justify-end gap-2 pt-2">
           <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
           <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
         </div>
       </form>
     );
   }
   ```

5. **LeadFormPage** (create + edit) — `frontend/src/features/leads/LeadFormPage.tsx`:
   ```tsx
   import { useState } from 'react';
   import { Link, useNavigate, useParams } from 'react-router-dom';
   import { Card } from '@/ui/Card';
   import { ApiError } from '@/api/client';
   import { LeadForm } from './LeadForm';
   import { useCreateLead, useLead, useUpdateLead } from './api';
   import type { LeadFormValues } from './schemas';

   export function LeadFormPage({ mode }: { mode: 'create' | 'edit' }) {
     const nav = useNavigate();
     const params = useParams<{ id: string }>();
     const id = params.id ? Number(params.id) : undefined;

     const leadQuery = useLead(mode === 'edit' ? id : undefined);
     const create = useCreateLead();
     const update = useUpdateLead(id ?? 0);

     const [formError, setFormError] = useState<string | undefined>();
     const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LeadFormValues, string>>>({});

     if (mode === 'edit' && leadQuery.error instanceof ApiError && leadQuery.error.status === 404) {
       return <Card><p>Lead not found.</p><Link to="/leads" className="text-brand underline">Back to leads</Link></Card>;
     }
     if (mode === 'edit' && leadQuery.isLoading) return <p>Loading…</p>;

     const handleSubmit = async (values: LeadFormValues) => {
       setFormError(undefined); setFieldErrors({});
       try {
         if (mode === 'create') { await create.mutateAsync(values); nav('/leads'); }
         else                   { await update.mutateAsync(values); nav(`/leads/${id}`); }
       } catch (e) {
         if (e instanceof ApiError && e.status === 422 && e.details) {
           const det = e.details as { fieldErrors?: Record<string, string[]> };
           const next: Partial<Record<keyof LeadFormValues, string>> = {};
           for (const [k, msgs] of Object.entries(det.fieldErrors ?? {})) next[k as keyof LeadFormValues] = msgs[0];
           setFieldErrors(next);
         } else { setFormError('Could not save the lead.'); }
       }
     };

     return (
       <Card className="max-w-xl">
         <h1 className="text-xl font-bold mb-4">{mode === 'create' ? 'New lead' : 'Edit lead'}</h1>
         <LeadForm
           defaultValues={mode === 'edit' ? leadQuery.data : undefined}
           submitLabel={mode === 'create' ? 'Create' : 'Save'}
           pending={create.isPending || update.isPending}
           formError={formError}
           fieldErrors={fieldErrors}
           onSubmit={handleSubmit}
           onCancel={() => nav(mode === 'create' ? '/leads' : `/leads/${id}`)}
         />
       </Card>
     );
   }
   ```

6. **Mount routes** — patch `router.tsx`:
   ```tsx
   import { LeadFormPage } from './features/leads/LeadFormPage';
   { path: 'leads/new',       element: <AppShell><LeadFormPage mode="create" /></AppShell> },
   { path: 'leads/:id/edit',  element: <AppShell><LeadFormPage mode="edit"   /></AppShell> },
   ```

**Tests** — `frontend/src/features/leads/LeadFormPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LeadFormPage } from './LeadFormPage';
import { defaultAuthHandlers } from '@/test/handlers';

const server = setupServer(...defaultAuthHandlers);
beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(...defaultAuthHandlers); localStorage.clear(); });
afterAll(() => server.close());

function wrap(initial: string, ui: React.ReactNode) {
  localStorage.setItem('mvp-crm-token', 'fake-jwt');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}><AuthProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/leads/new" element={ui} />
          <Route path="/leads/:id/edit" element={ui} />
          <Route path="/leads" element={<div>LIST</div>} />
          <Route path="/leads/:id" element={<div>DETAIL</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider></QueryClientProvider>
  );
}

describe('LeadFormPage', () => {
  it('creates a lead and navigates to /leads', async () => {
    server.use(http.post('/api/leads', async ({ request }) => HttpResponse.json({ id: 1, ...(await request.json() as any), stage: 'Evaluating', ownerId: 1 }, { status: 201 })));
    const u = userEvent.setup();
    render(wrap('/leads/new', <LeadFormPage mode="create" />));
    await u.type(screen.getByLabelText(/opportunity name/i), 'Acme');
    await u.type(screen.getByLabelText(/contact person/i), 'Jane');
    await u.type(screen.getByLabelText(/closing date/i), '2026-12-01');
    await u.clear(screen.getByLabelText(/lead value/i));
    await u.type(screen.getByLabelText(/lead value/i), '5000');
    await u.click(screen.getByRole('button', { name: /^Create$/ }));
    expect(await screen.findByText('LIST')).toBeInTheDocument();
  });

  it('shows inline errors on client-side validation failure', async () => {
    const u = userEvent.setup();
    render(wrap('/leads/new', <LeadFormPage mode="create" />));
    await u.click(screen.getByRole('button', { name: /^Create$/ }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('renders Lead not found on 404 in edit', async () => {
    server.use(http.get('/api/leads/9999', () => HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Lead not found' } }, { status: 404 })));
    render(wrap('/leads/9999/edit', <LeadFormPage mode="edit" />));
    expect(await screen.findByText(/Lead not found/i)).toBeInTheDocument();
  });
});
```

Manual tests:
- `/leads/new` → fill form → Create → toast-less but list shows the new row.
- Empty form → Create → 4 inline errors.
- Negative lead value → inline error.
- Click an existing row → /leads/:id (Story 4.6); on detail page click "Edit" → /leads/:id/edit prefilled.
- Hand-craft `/leads/9999/edit` → "Lead not found".

**Quality**: ESLint 0; Vitest passes; coverage ≥85%.

**OUT**:
- ❌ Stage transition UI — Story 4.6.
- ❌ Detail page itself (read-only view) — Story 4.6.
- ❌ Owner reassignment field — out of scope.
- ❌ Inline editing in the table — out of scope.
- ❌ Multi-currency input — out of scope.

**Evidence**: Screenshots of new lead form, validation errors, edit prefilled. Vitest output.
