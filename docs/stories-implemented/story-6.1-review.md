# Story 6.1 Self-Review

**Date**: 2026-05-20
**Story**: Mailer + Digest Repository
**Developer**: DEV Agent (subagent, Mode 2 parallel)

---

## What Was Implemented

- `digest.types.ts` — `SentMessage`, `Mailer` interface, `DigestRun` interface
- `mailer.ts` — `createNodemailerMailer()` (production SMTP transporter) + `createFakeMailer()` (in-memory test double with `failOn` support)
- `digest.repository.ts` — `digestRepository.create()` and `listRecent()` backed by better-sqlite3 prepared statements over `digest_runs` table

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/features/digest/digest.types.ts` | New | SentMessage, Mailer, DigestRun |
| `backend/src/features/digest/mailer.ts` | New | createNodemailerMailer + createFakeMailer |
| `backend/src/features/digest/digest.repository.ts` | New | digestRepository (create, listRecent) |
| `backend/src/features/digest/digest.repository.test.ts` | New | 3 unit tests |

## Patterns Applied

| Pattern | Where Applied | Notes |
|---------|---------------|-------|
| Inject fakes via factory (§ 8.4) | `mailer.ts` | createFakeMailer() — no vi.mock('nodemailer') |
| Repository owns SQL (§ 4.2) | `digest.repository.ts` | All digest_runs SQL in one file |
| Per-recipient try/catch exception (§ 2.4) | N/A | Documented; applied in story 6.2 |

## Testing Summary

- **Unit Tests**: 3 written, all passing
- **Coverage**: digest.repository.ts 100% (exceeds ≥90% critical file target); mailer.ts 60% (createNodemailerMailer not tested — requires real SMTP; intentional per spec)

**Test Output**:
```
✓ digestRepository > creates a row and returns it
✓ digestRepository > listRecent orders by run_at DESC and respects limit
✓ createFakeMailer > captures sent messages and honours failOn

Tests  3 passed (3)
```

## DoD Evidence

| Requirement | Evidence |
|-------------|----------|
| Mailer interface: `send({to, subject, text, html?}): Promise<void>` | `digest.types.ts:4` |
| createNodemailerMailer returns Mailer backed by nodemailer | `mailer.ts:8-18` |
| createFakeMailer captures sent array + failOn predicate | Test: `captures sent messages and honours failOn` |
| digestRepository.create inserts row, returns with id | Test: `creates a row and returns it` — r.id > 0 |
| digestRepository.listRecent orders by run_at DESC, respects limit | Test: `listRecent orders by run_at DESC` — second.id === list[0].id |
| Both use prepared statements, no string-concat SQL | `digest.repository.ts:16-17` — insertStmt + listStmt |
| No vi.mock('nodemailer') | digest.repository.test.ts — uses createFakeMailer() only |
| Coverage ≥90% on repository | digest.repository.ts 100% |

## Challenges Encountered

| Challenge | Resolution |
|-----------|------------|
| createNodemailerMailer untestable without SMTP | Intentional — spec calls for fake mailer via factory pattern; production path deferred to integration |

## Deviations from Plan

- None

## Next Steps

- [ ] Ready for code review
- [ ] Story 6.2 (Digest service — runWeeklyDigest, per-recipient try/catch) can now be implemented
