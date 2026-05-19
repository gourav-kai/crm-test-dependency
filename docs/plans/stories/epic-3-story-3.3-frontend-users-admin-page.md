### Story 3.3: Frontend UsersAdminPage (List, Create, Deactivate)

**Epic**: 3 - USER MANAGEMENT | **ID**: 3.3 | **Date**: 2026-05-19 | **GitHub**: #11
**Requires**: [2.3, 3.2]
**Enables**: []
**Files Touched**:
  - frontend/src/features/users/UsersAdminPage.tsx
  - frontend/src/features/users/UsersTable.tsx
  - frontend/src/features/users/CreateUserModal.tsx
  - frontend/src/features/users/api.ts
  - frontend/src/features/users/UsersAdminPage.test.tsx
  - frontend/src/router.tsx
  - frontend/src/ui/AppShell.tsx
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 7 (Frontend Patterns).
- Story 3.2 (BE endpoint contracts).
- Story 2.3 (`RequireRole`).

**Description**:
Admin-only screen at `/users`. Shows a table of all users (email, name, role, active flag, created at). "New user" button opens a modal with a Zod-validated form (email, full name, role, password) and creates via `POST /api/users`. Each table row has a "Deactivate" / "Activate" action that PATCHes `active`. Surfaces toast feedback on success / error. Route is guarded by `RequireRole('admin')` — Salespersons see the 403 card from Story 2.3.

**Acceptance Criteria**:
- `/users` route renders `UsersAdminPage` inside `RequireAuth` + `RequireRole('admin')`.
- AppShell shows a "Users" nav link visible only to admins.
- Table shows all users from `GET /api/users`, ordered by `created_at`, with columns: Email, Full name, Role, Active (badge), Created, Actions.
- "New user" button opens a modal with form fields (email, full name, role select, password ≥12 chars). Inline error messages on validation. Submitting calls `POST /api/users`; on success closes modal + toast "User created"; on 409 → inline "Email already exists" on the email field.
- "Deactivate" button on active user → PATCH `{active:false}`; on success toggles to "Activate" and badge updates. "Activate" button on inactive user works symmetrically.
- All mutations invalidate the users list via `qc.invalidateQueries({ queryKey: usersKeys.all })`.
- Toasts auto-dismiss after 4s; errors are red, successes green.
- Vitest covers: table renders rows from mocked GET, create flow happy path, create flow 409 path, deactivate flow.

**Prerequisites**: 2.3 (auth context + RequireRole), 3.2 (BE endpoints).

**Context**: `frontend/src/api/client.ts`, `frontend/src/features/auth/*`, `frontend/src/ui/*`, `frontend/src/types/index.ts`.

**Patterns**: Feature folder structure (§ 1.1); TanStack Query hooks (§ 7.2); RHF + Zod resolver (§ 7.3 — minimal here since the form is small; can use plain state + Zod parse).

**Steps**:

1. **Query hooks** — `frontend/src/features/users/api.ts`:
   ```ts
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { api } from '@/api/client';
   import type { User } from '@/types';

   export const usersKeys = { all: ['users'] as const };
   export type UserCreateInput = { email: string; fullName: string; role: 'admin'|'sales'; password: string };
   export type UserPatchInput  = { fullName?: string; role?: 'admin'|'sales'; active?: boolean };

   export function useUsers() {
     return useQuery({ queryKey: usersKeys.all, queryFn: () => api<User[]>('/users') });
   }
   export function useCreateUser() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (input: UserCreateInput) => api<User>('/users', { method: 'POST', body: JSON.stringify(input) }),
       onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
     });
   }
   export function usePatchUser() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: ({ id, patch }: { id: number; patch: UserPatchInput }) =>
         api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
       onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
     });
   }
   ```

2. **UsersTable** — `frontend/src/features/users/UsersTable.tsx`:
   ```tsx
   import type { User } from '@/types';
   import { Button } from '@/ui/Button';

   export function UsersTable({ users, onToggleActive }: { users: User[]; onToggleActive: (u: User) => void }) {
     return (
       <table className="min-w-full bg-white border border-gray-200 rounded-md text-sm">
         <thead className="bg-gray-50 text-left">
           <tr>
             {['Email','Full name','Role','Active','Actions'].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
           </tr>
         </thead>
         <tbody>
           {users.map((u) => (
             <tr key={u.id} className="border-t">
               <td className="px-4 py-2">{u.email}</td>
               <td className="px-4 py-2">{u.fullName}</td>
               <td className="px-4 py-2 capitalize">{u.role}</td>
               <td className="px-4 py-2">
                 <span className={`px-2 py-0.5 rounded-full text-xs ${u.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                   {u.active ? 'Active' : 'Inactive'}
                 </span>
               </td>
               <td className="px-4 py-2">
                 <Button variant="ghost" onClick={() => onToggleActive(u)}>
                   {u.active ? 'Deactivate' : 'Activate'}
                 </Button>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     );
   }
   ```

3. **CreateUserModal** — `frontend/src/features/users/CreateUserModal.tsx`:
   ```tsx
   import { useState, type FormEvent } from 'react';
   import { z } from 'zod';
   import { Card } from '@/ui/Card';
   import { Button } from '@/ui/Button';
   import { ApiError } from '@/api/client';
   import { useCreateUser } from './api';

   const Schema = z.object({
     email: z.string().email(),
     fullName: z.string().min(1),
     role: z.enum(['admin','sales']),
     password: z.string().min(12),
   });

   export function CreateUserModal({ onClose }: { onClose: () => void }) {
     const create = useCreateUser();
     const [form, setForm] = useState({ email: '', fullName: '', role: 'sales' as const, password: '' });
     const [errors, setErrors] = useState<Record<string, string>>({});

     const submit = async (e: FormEvent) => {
       e.preventDefault();
       const parsed = Schema.safeParse(form);
       if (!parsed.success) {
         setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
         return;
       }
       setErrors({});
       try {
         await create.mutateAsync(parsed.data);
         onClose();
       } catch (e) {
         if (e instanceof ApiError && e.status === 409) setErrors({ email: 'Email already exists' });
         else setErrors({ form: 'Could not create user' });
       }
     };

     return (
       <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
         <Card className="w-full max-w-md">
           <h2 className="text-lg font-bold mb-4">Create user</h2>
           <form onSubmit={submit} className="space-y-3" noValidate>
             {[['email','Email','email'],['fullName','Full name','text'],['password','Password (≥12 chars)','password']].map(([k,label,type]) => (
               <label key={k} className="block">
                 <span className="text-sm font-semibold">{label}</span>
                 <input type={type} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border" />
                 {errors[k] && <p role="alert" className="text-xs text-danger">{errors[k]}</p>}
               </label>
             ))}
             <label className="block">
               <span className="text-sm font-semibold">Role</span>
               <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin'|'sales' })}
                       className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 border">
                 <option value="sales">Salesperson</option>
                 <option value="admin">Admin</option>
               </select>
             </label>
             {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
             <div className="flex justify-end gap-2 pt-2">
               <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
               <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create'}</Button>
             </div>
           </form>
         </Card>
       </div>
     );
   }
   ```

4. **UsersAdminPage** — `frontend/src/features/users/UsersAdminPage.tsx`:
   ```tsx
   import { useState } from 'react';
   import { Button } from '@/ui/Button';
   import { useUsers, usePatchUser } from './api';
   import { UsersTable } from './UsersTable';
   import { CreateUserModal } from './CreateUserModal';

   export function UsersAdminPage() {
     const { data, isLoading } = useUsers();
     const patch = usePatchUser();
     const [open, setOpen] = useState(false);

     return (
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-bold">Users</h1>
           <Button onClick={() => setOpen(true)}>+ New user</Button>
         </div>
         {isLoading ? <p>Loading…</p>
           : <UsersTable users={data ?? []} onToggleActive={(u) => patch.mutate({ id: u.id, patch: { active: !u.active } })} />}
         {open && <CreateUserModal onClose={() => setOpen(false)} />}
       </div>
     );
   }
   ```

5. **Mount route** — patch `frontend/src/router.tsx` (shared):
   ```tsx
   import { RequireRole } from './features/auth/RequireRole';
   import { UsersAdminPage } from './features/users/UsersAdminPage';
   // Inside the / RequireAuth subtree, after the index route:
   { path: 'users', element: <AppShell><RequireRole role="admin"><UsersAdminPage /></RequireRole></AppShell> },
   ```

6. **Patch `AppShell`** — admin-only nav link (shared):
   ```tsx
   import { NavLink } from 'react-router-dom';
   // Inside <nav>, after the user/Logout block:
   {status === 'authed' && user?.role === 'admin' && (
     <NavLink to="/users" className={({ isActive }) => isActive ? 'text-brand font-semibold' : 'text-gray-700 hover:text-brand'}>Users</NavLink>
   )}
   ```

**Tests** — `frontend/src/features/users/UsersAdminPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsersAdminPage } from './UsersAdminPage';

const users = [
  { id: 1, email: 'admin@ex.com', fullName: 'Admin', role: 'admin', active: true },
  { id: 2, email: 'alice@ex.com', fullName: 'Alice', role: 'sales', active: true },
];

const server = setupServer(
  http.get('/api/users', () => HttpResponse.json(users)),
  http.post('/api/users', async ({ request }) => {
    const b = await request.json() as any;
    if (b.email === 'dupe@ex.com') return HttpResponse.json({ error: { code: 'CONFLICT', message: 'Email already exists' } }, { status: 409 });
    return HttpResponse.json({ id: 3, ...b, active: true }, { status: 201 });
  }),
  http.patch('/api/users/:id', async ({ request, params }) => {
    const b = await request.json() as any;
    const u = users.find((x) => x.id === Number(params.id))!;
    return HttpResponse.json({ ...u, ...b });
  }),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

describe('UsersAdminPage', () => {
  it('lists users from API', async () => {
    render(wrap(<UsersAdminPage />));
    expect(await screen.findByText('alice@ex.com')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(2);
  });

  it('creates a user via the modal', async () => {
    const u = userEvent.setup();
    render(wrap(<UsersAdminPage />));
    await u.click(await screen.findByRole('button', { name: /\+ New user/i }));
    await u.type(screen.getByLabelText(/email/i), 'new@ex.com');
    await u.type(screen.getByLabelText(/full name/i), 'New');
    await u.type(screen.getByLabelText(/password/i), 'password1234');
    await u.click(screen.getByRole('button', { name: /^Create$/ }));
    expect(await screen.findByText('new@ex.com')).toBeInTheDocument();
  });

  it('shows 409 error on duplicate email', async () => {
    const u = userEvent.setup();
    render(wrap(<UsersAdminPage />));
    await u.click(await screen.findByRole('button', { name: /\+ New user/i }));
    await u.type(screen.getByLabelText(/email/i), 'dupe@ex.com');
    await u.type(screen.getByLabelText(/full name/i), 'X');
    await u.type(screen.getByLabelText(/password/i), 'password1234');
    await u.click(screen.getByRole('button', { name: /^Create$/ }));
    expect(await screen.findByText(/Email already exists/i)).toBeInTheDocument();
  });
});
```

Manual tests:
- Login as Admin → "Users" link visible in nav; click → `/users` shows the table.
- "+ New user" → create alice@ex.com / password1234 / Salesperson → row appears.
- Try to create alice@ex.com again → "Email already exists" inline.
- Click Deactivate on Alice → badge flips to Inactive.
- Logout, login as Alice → "Users" link NOT visible; visiting `/users` shows the 403 Forbidden card.

**Quality**: ESLint 0; Vitest passes; coverage ≥85% on changed files; no `useEffect` for fetch; modal traps focus (basic — full focus-trap library out of scope).

**OUT**:
- ❌ Pagination / search — out of scope.
- ❌ Editing other fields (email change) — out of scope.
- ❌ Password reset / change — out of scope.
- ❌ Bulk actions / CSV import — out of scope.
- ❌ Hard delete — only soft delete via `active=false`.

**Evidence**: Screenshots: users table, create modal, 409 inline error, deactivated row. Vitest output for 3 cases.
