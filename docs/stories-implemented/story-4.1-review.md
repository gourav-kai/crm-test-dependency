# Story 4.1 Self-Review

**Date**: 2026-05-20
**Story**: Leads Repository (Prepared Statements, Role-Scoped Queries)
**Developer**: DEV Agent (subagent, Mode 2 parallel)

---

## What Was Implemented

- `leads.types.ts` — `Stage` union type, `STAGES` const tuple, `Lead` camelCase interface
- `leads.repository.ts` — full CRUD + aggregations via better-sqlite3 prepared statements
  - `listForUser` — role-scoped (sales sees only own leads; admin sees all); optional stage filter + case-insensitive LIKE search
  - `findById`, `create`, `update`, `updateStage`, `delete`
  - `countByOwner` / `countByStage` — analytics aggregations (consumed by story 5.1)
- `rowToLead` mapper — DB snake_case → API camelCase

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/features/leads/leads.types.ts` | New | Stage, STAGES, Lead interface |
| `backend/src/features/leads/leads.repository.ts` | New | Full repository with prepared statements |
| `backend/src/features/leads/leads.repository.test.ts` | New | 7 unit tests |

## Patterns Applied

| Pattern | Where Applied | Notes |
|---------|---------------|-------|
| Repository pattern (§ 4.2) | `leads.repository.ts` | All SQL in this file only |
| Prepared statements only (§ 4.5) | All methods | Dynamic queries use `db.prepare()` inline; no string concat for values |
| camelCase/snake_case mapper (§ 5.5) | `rowToLead` | One mapper function, called consistently |

## Testing Summary

- **Unit Tests**: 7 written, all passing
- **Coverage**: 98.66% statements on leads.repository.ts (exceeds ≥90% critical file target)

**Test Output**:
```
✓ leadsRepository.listForUser > returns only the rep's rows for sales
✓ leadsRepository.listForUser > returns all for admin
✓ leadsRepository.listForUser > filters by stage
✓ leadsRepository.listForUser > search is case-insensitive substring on opportunity_name
✓ leadsRepository CRUD > create → findById → update → updateStage → delete
✓ leadsRepository aggregations > countByStage returns all 4 stages even when 0 leads
✓ leadsRepository aggregations > countByOwner returns 0 for active sales users with no leads

Tests  7 passed (7)
```

## DoD Evidence

| Requirement | Evidence |
|-------------|----------|
| listForUser role-scopes sales to own rows | Test: `returns only the rep's rows for sales` — alice gets 2/3 leads |
| listForUser returns all for admin | Test: `returns all for admin` — admin sees 2 leads from alice |
| Stage filter works | Test: `filters by stage` — Proposing=1, Complete=0 |
| Case-insensitive substring search | Test: `search is case-insensitive substring` — 'acm' matches 'Acme Corp' |
| Full CRUD lifecycle | Test: `create → findById → update → updateStage → delete` |
| countByStage fills all 4 stages (zero-count included) | Test: `countByStage returns all 4 stages even when 0 leads` |
| Prepared statements only — no SQL outside this file | `backend/src/features/leads/leads.repository.ts` — all SQL lives here |
| Coverage ≥90% on repository | 98.66% statements |

## Challenges Encountered

| Challenge | Resolution |
|-----------|------------|
| Prepared statements (`findByIdStmt`, `insertStmt`) execute at module load, before migrations | factories.ts calls `applyMigrations` on import, so tables exist before repository loads |

## Deviations from Plan

- None

## Next Steps

- [ ] Ready for code review
- [ ] Story 4.2 (Leads service — role scope enforcement) can now be implemented
