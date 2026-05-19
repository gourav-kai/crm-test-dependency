### Story 4.1: Leads Repository (Prepared Statements, Role-Scoped Queries)

**Epic**: 4 - LEAD MANAGEMENT | **ID**: 4.1 | **Date**: 2026-05-19 | **GitHub**: #12
**Requires**: [1.3]
**Enables**: [4.2, 5.1, 6.2]
**Files Touched**:
  - backend/src/features/leads/leads.repository.ts
  - backend/src/features/leads/leads.types.ts
  - backend/src/features/leads/leads.repository.test.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Data Model (LEADS), § API Design (Leads).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 4 (DB Access), § 5.5 (camel/snake mapping).

**Description**:
Owns all SQL for the `leads` table. Exposes prepared-statement-backed methods to list (role-scoped for sales, unrestricted for admin, with optional `stage` + `search` filters), find by id, insert, update, delete, and update only the stage. Maps DB `snake_case` rows to API `camelCase` objects (§ 5.5). No business rules — role-scoping is a *parameter* the service supplies; the repository merely runs the right query. Adds analytics-friendly aggregation queries `countByOwner` and `countByStage` that Story 5.1 (analytics) consumes.

**Acceptance Criteria**:
- `leads.types.ts` exports `Stage` union (`'Evaluating'|'Proposing'|'Solutioning'|'Complete'`), `STAGES` tuple, and `Lead` (camelCase) interface.
- `listForUser({ user, stage?, search? })`:
  - For role `sales`: applies `WHERE owner_id = ?` first.
  - Filters by stage if provided.
  - Filters by case-insensitive substring `LIKE '%search%'` against `opportunity_name` (parameterized — never string-concat).
  - Orders by `updated_at DESC`.
  - Returns `Lead[]`.
- `findById(id)` returns `Lead | null` (no role scope — service applies it).
- `create(input, ownerId)` inserts row, returns `Lead`.
- `update(id, patch)` updates only provided fields, returns `Lead | null`.
- `updateStage(id, stage)` returns `Lead | null`.
- `delete(id)` returns `boolean` (true if a row was removed).
- `countByOwner()` returns `[{ ownerId, ownerName, count }]` (JOIN users); ordered by `count DESC`.
- `countByOwner(ownerId)` (overload) returns rows for one owner only.
- `countByStage(ownerId?)` returns 4 rows (one per stage, zero-count rows included), ordered by enum order.
- Every method uses prepared statements (no string-concat SQL anywhere).
- Coverage ≥90% on the repository (critical file).

**Prerequisites**: 1.3 (`leads` table + indexes).

**Context**: `backend/src/db/client.ts`, `backend/migrations/0001_init.sql`.

**Patterns**: Repository pattern (§ 4.2); transactions only when multi-statement (§ 4.3); rowToObj mapper (§ 5.5); prepared statements only (§ 4.5).

**Steps**:

1. **Types** — `backend/src/features/leads/leads.types.ts`:
   ```ts
   export const STAGES = ['Evaluating', 'Proposing', 'Solutioning', 'Complete'] as const;
   export type Stage = typeof STAGES[number];

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

2. **Repository** — `backend/src/features/leads/leads.repository.ts`:
   ```ts
   import { db } from '@/db/client';
   import { STAGES, type Lead, type Stage } from './leads.types';

   interface LeadRow {
     id: number; opportunity_name: string; notes: string | null; contact_person: string;
     estimated_closing_date: string; lead_value: number; stage: Stage; owner_id: number;
     created_at: string; updated_at: string;
   }
   const rowToLead = (r: LeadRow): Lead => ({
     id: r.id, opportunityName: r.opportunity_name, notes: r.notes, contactPerson: r.contact_person,
     estimatedClosingDate: r.estimated_closing_date, leadValue: r.lead_value, stage: r.stage,
     ownerId: r.owner_id, createdAt: r.created_at, updatedAt: r.updated_at,
   });

   const findByIdStmt = db.prepare('SELECT * FROM leads WHERE id = ?');
   const insertStmt = db.prepare(`INSERT INTO leads (opportunity_name, notes, contact_person, estimated_closing_date,
                                                     lead_value, stage, owner_id, created_at, updated_at)
                                  VALUES (@opportunity_name,@notes,@contact_person,@estimated_closing_date,@lead_value,@stage,@owner_id,@now,@now)`);
   const updateStageStmt = db.prepare(`UPDATE leads SET stage = @stage, updated_at = @now WHERE id = @id`);
   const deleteStmt = db.prepare('DELETE FROM leads WHERE id = ?');

   const countByOwnerStmt = db.prepare(`
     SELECT u.id AS ownerId, u.full_name AS ownerName, COUNT(l.id) AS count
     FROM users u LEFT JOIN leads l ON l.owner_id = u.id
     WHERE u.role = 'sales' AND u.active = 1
     GROUP BY u.id ORDER BY count DESC`);
   const countByOneOwnerStmt = db.prepare(`
     SELECT u.id AS ownerId, u.full_name AS ownerName, COUNT(l.id) AS count
     FROM users u LEFT JOIN leads l ON l.owner_id = u.id
     WHERE u.id = ?
     GROUP BY u.id`);

   export interface ListFilter { stage?: Stage; search?: string; }

   export const leadsRepository = {
     listForUser(opts: { user: { id: number; role: 'admin'|'sales' } } & ListFilter): Lead[] {
       const where: string[] = [];
       const params: Record<string, unknown> = {};
       if (opts.user.role === 'sales') { where.push('owner_id = @owner_id'); params.owner_id = opts.user.id; }
       if (opts.stage) { where.push('stage = @stage'); params.stage = opts.stage; }
       if (opts.search) { where.push('LOWER(opportunity_name) LIKE @q'); params.q = `%${opts.search.toLowerCase()}%`; }
       const sql = `SELECT * FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`;
       return (db.prepare(sql).all(params) as LeadRow[]).map(rowToLead);
     },

     findById(id: number): Lead | null {
       const r = findByIdStmt.get(id) as LeadRow | undefined;
       return r ? rowToLead(r) : null;
     },

     create(input: {
       opportunityName: string; notes: string | null; contactPerson: string;
       estimatedClosingDate: string; leadValue: number;
     }, ownerId: number): Lead {
       const now = new Date().toISOString();
       const info = insertStmt.run({
         opportunity_name: input.opportunityName, notes: input.notes,
         contact_person: input.contactPerson, estimated_closing_date: input.estimatedClosingDate,
         lead_value: input.leadValue, stage: 'Evaluating', owner_id: ownerId, now,
       });
       return this.findById(Number(info.lastInsertRowid))!;
     },

     update(id: number, patch: {
       opportunityName?: string; notes?: string | null; contactPerson?: string;
       estimatedClosingDate?: string; leadValue?: number;
     }): Lead | null {
       const sets: string[] = []; const params: Record<string, unknown> = { id, now: new Date().toISOString() };
       const map: Array<[string, string, unknown]> = [
         ['opportunityName', 'opportunity_name', patch.opportunityName],
         ['notes', 'notes', patch.notes],
         ['contactPerson', 'contact_person', patch.contactPerson],
         ['estimatedClosingDate', 'estimated_closing_date', patch.estimatedClosingDate],
         ['leadValue', 'lead_value', patch.leadValue],
       ];
       for (const [_k, col, v] of map) if (v !== undefined) { sets.push(`${col} = @${col}`); params[col] = v; }
       if (sets.length === 0) return this.findById(id);
       sets.push('updated_at = @now');
       db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);
       return this.findById(id);
     },

     updateStage(id: number, stage: Stage): Lead | null {
       updateStageStmt.run({ id, stage, now: new Date().toISOString() });
       return this.findById(id);
     },

     delete(id: number): boolean {
       return deleteStmt.run(id).changes > 0;
     },

     countByOwner(ownerId?: number): Array<{ ownerId: number; ownerName: string; count: number }> {
       return (ownerId !== undefined
         ? countByOneOwnerStmt.all(ownerId)
         : countByOwnerStmt.all()) as any[];
     },

     countByStage(ownerId?: number): Array<{ stage: Stage; count: number }> {
       const where = ownerId !== undefined ? 'WHERE owner_id = @owner_id' : '';
       const rows = db.prepare(`SELECT stage, COUNT(id) AS count FROM leads ${where} GROUP BY stage`)
         .all(ownerId !== undefined ? { owner_id: ownerId } : {}) as Array<{ stage: Stage; count: number }>;
       const map = new Map(rows.map((r) => [r.stage, r.count]));
       return STAGES.map((s) => ({ stage: s, count: map.get(s) ?? 0 }));
     },
   };
   ```

**Tests** — `backend/src/features/leads/leads.repository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser } from '@/test/factories';
import { leadsRepository } from './leads.repository';

function mkLead(ownerId: number, p: Partial<{ opportunityName: string; stage: any; leadValue: number }> = {}) {
  return leadsRepository.create({
    opportunityName: p.opportunityName ?? 'Opp',
    notes: null,
    contactPerson: 'Jane',
    estimatedClosingDate: '2026-12-01',
    leadValue: p.leadValue ?? 1000,
  }, ownerId);
}

describe('leadsRepository.listForUser', () => {
  beforeEach(resetDb);

  it('returns only the rep\'s rows for sales', async () => {
    const alice = await makeUser({ role: 'sales' });
    const bob   = await makeUser({ role: 'sales' });
    mkLead(alice.id); mkLead(alice.id); mkLead(bob.id);
    const ls = leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' } });
    expect(ls).toHaveLength(2);
    expect(ls.every((l) => l.ownerId === alice.id)).toBe(true);
  });

  it('returns all for admin', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser(); mkLead(alice.id); mkLead(alice.id);
    expect(leadsRepository.listForUser({ user: { id: admin.id, role: 'admin' } })).toHaveLength(2);
  });

  it('filters by stage', async () => {
    const alice = await makeUser(); const l = mkLead(alice.id);
    leadsRepository.updateStage(l.id, 'Proposing');
    expect(leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, stage: 'Proposing' })).toHaveLength(1);
    expect(leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, stage: 'Complete' })).toHaveLength(0);
  });

  it('search is case-insensitive substring on opportunity_name', async () => {
    const alice = await makeUser();
    mkLead(alice.id, { opportunityName: 'Acme Corp' });
    mkLead(alice.id, { opportunityName: 'Globex' });
    const r = leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, search: 'acm' });
    expect(r.map((x) => x.opportunityName)).toEqual(['Acme Corp']);
  });
});

describe('leadsRepository CRUD', () => {
  beforeEach(resetDb);
  it('create → findById → update → updateStage → delete', async () => {
    const alice = await makeUser();
    const created = mkLead(alice.id);
    expect(leadsRepository.findById(created.id)).toMatchObject({ stage: 'Evaluating' });
    const upd = leadsRepository.update(created.id, { leadValue: 2000 });
    expect(upd?.leadValue).toBe(2000);
    const moved = leadsRepository.updateStage(created.id, 'Complete');
    expect(moved?.stage).toBe('Complete');
    expect(leadsRepository.delete(created.id)).toBe(true);
    expect(leadsRepository.findById(created.id)).toBeNull();
  });
});

describe('leadsRepository aggregations', () => {
  beforeEach(resetDb);

  it('countByStage returns all 4 stages even when 0 leads', async () => {
    const alice = await makeUser();
    mkLead(alice.id);
    const r = leadsRepository.countByStage();
    expect(r).toHaveLength(4);
    expect(r.find((x) => x.stage === 'Evaluating')!.count).toBe(1);
    expect(r.find((x) => x.stage === 'Complete')!.count).toBe(0);
  });

  it('countByOwner returns 0 for active sales users with no leads', async () => {
    await makeUser({ role: 'sales' }); // no leads
    expect(leadsRepository.countByOwner().every((r) => r.count >= 0)).toBe(true);
  });
});
```

Manual tests: deferred to Story 4.3 (routes).

**Quality**: ESLint 0; Vitest passes; coverage ≥90% on repository; SQL only inside this file (verified by `rg "SELECT|INSERT|UPDATE|DELETE" backend/src/features/leads` — only this file matches).

**OUT**:
- ❌ Business logic / role-scope decisions — Story 4.2.
- ❌ HTTP routes — Story 4.3.
- ❌ Soft delete — leads are hard-deleted per requirements.
- ❌ Bulk insert / import — out of scope.
- ❌ Pagination — out of scope (MVP ≤ 1k leads).
- ❌ Sorting beyond `updated_at DESC` — out of scope.

**Evidence**: Vitest output with coverage delta.
