### Story 4.2: Leads Service (Role Scope Enforcement, Stage Transitions)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.2 | **Date**: 2026-05-19 | **GitHub**: #13
**Requires**: [2.1, 4.1]
**Enables**: [4.3]
**Files Touched**:
  - backend/src/features/leads/leads.service.ts
  - backend/src/features/leads/leads.service.test.ts
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Security (Authorization), § API Design.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 2 (Errors), § 5 (API Design — 404 not 403 on cross-rep).
- Story 4.1 (repository).

**Description**:
Implements the role-scope policy for the leads feature. Services take a `user: { id, role }` argument and decide what each user is allowed to see, edit, or delete. Salespersons can only access leads where `owner_id == user.id`; cross-rep access yields a `NotFoundError` (intentionally 404, not 403, to prevent ID enumeration). Admins access everything. Also validates stage transitions against the enum. No HTTP concerns here (those are in 4.3).

**Acceptance Criteria**:
- `list(user, filter)` calls `leadsRepository.listForUser` with the user; rep sees only own; admin sees all; `stage`/`search` filters pass through.
- `getById(id, user)`:
  - Admin → returns the lead or throws `NotFoundError('Lead')` if missing.
  - Sales → if missing OR `owner_id !== user.id` → throws `NotFoundError('Lead')` (same payload).
- `create(input, user)` → owner_id set to `user.id` (rep), or to `input.ownerId ?? user.id` if admin and `ownerId` provided. For MVP simplicity: ALWAYS use `user.id` (admin creating on behalf of someone is out of scope per requirements). Returns the new lead with stage `Evaluating`.
- `update(id, patch, user)` → calls `getById` first (enforcing scope), then `repository.update`.
- `delete(id, user)` → same scoping; returns true on success.
- `updateStage(id, stage, user)` → validates `stage` is in `STAGES`; if not, throws `ValidationError`. Then scopes via `getById`. Stage transitions are bidirectional (requirements explicitly allow this for MVP).
- All forbidden-by-scope paths return 404 envelope, never 403.
- Coverage ≥90% on the service.
- Tests with TWO sales users + one admin verify zero cross-rep leakage on every method.

**Prerequisites**: 4.1 (repository), 2.1 (`AuthedUser` type via `req.user`).

**Context**: `backend/src/features/leads/leads.repository.ts`, `backend/src/http/errors.ts`.

**Patterns**: Services apply scope, not routes (§ Security / § 5.6); throw typed errors (§ 2.3); never trust client `ownerId` / `role` (§ Anti-patterns).

**Steps**:

1. **Service** — `backend/src/features/leads/leads.service.ts`:
   ```ts
   import { leadsRepository, type ListFilter } from './leads.repository';
   import { STAGES, type Lead, type Stage } from './leads.types';
   import { NotFoundError, ValidationError } from '@/http/errors';

   export type AuthedUser = { id: number; role: 'admin' | 'sales' };

   export interface LeadCreateInput {
     opportunityName: string;
     notes?: string | null;
     contactPerson: string;
     estimatedClosingDate: string;
     leadValue: number;
   }
   export type LeadUpdateInput = Partial<LeadCreateInput>;

   function ensureAccess(lead: Lead | null, user: AuthedUser): Lead {
     if (!lead) throw new NotFoundError('Lead');
     if (user.role !== 'admin' && lead.ownerId !== user.id) throw new NotFoundError('Lead');
     return lead;
   }

   export const leadsService = {
     list(user: AuthedUser, filter: ListFilter = {}): Lead[] {
       return leadsRepository.listForUser({ user, ...filter });
     },

     getById(id: number, user: AuthedUser): Lead {
       return ensureAccess(leadsRepository.findById(id), user);
     },

     create(input: LeadCreateInput, user: AuthedUser): Lead {
       return leadsRepository.create({
         opportunityName: input.opportunityName,
         notes: input.notes ?? null,
         contactPerson: input.contactPerson,
         estimatedClosingDate: input.estimatedClosingDate,
         leadValue: input.leadValue,
       }, user.id);  // owner_id = self; admin-on-behalf-of out of scope per requirements.
     },

     update(id: number, patch: LeadUpdateInput, user: AuthedUser): Lead {
       ensureAccess(leadsRepository.findById(id), user);
       const updated = leadsRepository.update(id, patch);
       if (!updated) throw new NotFoundError('Lead');
       return updated;
     },

     updateStage(id: number, stage: string, user: AuthedUser): Lead {
       if (!STAGES.includes(stage as Stage)) {
         throw new ValidationError({ stage: [`must be one of ${STAGES.join(', ')}`] }, 'Invalid stage');
       }
       ensureAccess(leadsRepository.findById(id), user);
       const updated = leadsRepository.updateStage(id, stage as Stage);
       if (!updated) throw new NotFoundError('Lead');
       return updated;
     },

     delete(id: number, user: AuthedUser): { ok: true } {
       ensureAccess(leadsRepository.findById(id), user);
       leadsRepository.delete(id);
       return { ok: true };
     },
   };
   ```

**Tests** — `backend/src/features/leads/leads.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser } from '@/test/factories';
import { leadsService } from './leads.service';

const baseInput = {
  opportunityName: 'Acme', contactPerson: 'Jane Doe',
  estimatedClosingDate: '2026-12-01', leadValue: 5000, notes: null,
};

describe('leadsService — role isolation', () => {
  beforeEach(resetDb);

  it('rep sees only their own leads on list', async () => {
    const alice = await makeUser({ role: 'sales' });
    const bob   = await makeUser({ role: 'sales' });
    leadsService.create(baseInput, alice);
    leadsService.create(baseInput, alice);
    leadsService.create(baseInput, bob);
    expect(leadsService.list(alice)).toHaveLength(2);
    expect(leadsService.list(bob)).toHaveLength(1);
  });

  it('admin sees all leads on list', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    leadsService.create(baseInput, alice);
    leadsService.create(baseInput, alice);
    expect(leadsService.list(admin)).toHaveLength(2);
  });

  it('getById returns the lead for the owner', async () => {
    const alice = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    expect(leadsService.getById(lead.id, alice).id).toBe(lead.id);
  });

  it('getById throws 404 for cross-rep access (NOT 403)', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    expect(() => leadsService.getById(lead.id, bob)).toThrow(/Lead not found/);
  });

  it('getById returns lead for admin regardless of owner', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    expect(leadsService.getById(lead.id, admin).id).toBe(lead.id);
  });

  it('update is scoped — other rep cannot patch', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    const lead  = leadsService.create(baseInput, alice);
    expect(() => leadsService.update(lead.id, { leadValue: 999 }, bob)).toThrow(/Lead not found/);
    expect(leadsService.getById(lead.id, alice).leadValue).toBe(5000);
  });

  it('delete is scoped — other rep cannot delete', async () => {
    const alice = await makeUser();
    const bob   = await makeUser();
    const lead  = leadsService.create(baseInput, alice);
    expect(() => leadsService.delete(lead.id, bob)).toThrow(/Lead not found/);
  });
});

describe('leadsService — stage transitions', () => {
  beforeEach(resetDb);

  it('accepts every valid stage in any direction', async () => {
    const alice = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    for (const s of ['Proposing', 'Solutioning', 'Complete', 'Evaluating'] as const) {
      const r = leadsService.updateStage(lead.id, s, alice);
      expect(r.stage).toBe(s);
    }
  });

  it('rejects invalid stage with ValidationError', async () => {
    const alice = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    expect(() => leadsService.updateStage(lead.id, 'Closed', alice)).toThrow(/Invalid stage/);
  });

  it('cross-rep stage update → 404 NotFound', async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const lead = leadsService.create(baseInput, alice);
    expect(() => leadsService.updateStage(lead.id, 'Proposing', bob)).toThrow(/Lead not found/);
  });
});
```

Manual tests: deferred to Story 4.3 (routes).

**Quality**: ESLint 0; Vitest passes; coverage ≥90%; never throws `ForbiddenError` for cross-rep access (always `NotFoundError`).

**OUT**:
- ❌ HTTP routes — Story 4.3.
- ❌ Admin-creates-lead-on-behalf-of-rep — explicit OUT (one-step admin override is not in MVP).
- ❌ Audit log of stage changes — out of scope.
- ❌ Forward-only stage progression — requirements explicitly allow bidirectional.
- ❌ Soft delete — leads are hard-deleted.
- ❌ Reassignment of `ownerId` post-create — out of scope.

**Evidence**: Vitest output for both describe blocks; cross-rep cases visibly return 404 messages.
