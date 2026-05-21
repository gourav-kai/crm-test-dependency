# Requirements - Mvp-crm

**Date**: 2026-05-19
**Author**: ANALYST_PM_GREENFIELD
**Status**: Draft
**Version**: 1.0

---

## Project Overview

### Vision
A polished MVP-level CRM web application — Salesforce-inspired but intentionally minimal — for a single organization to manage sales leads through a defined pipeline, with role-based access, basic analytics, and a weekly automated email digest.

### Problem Statement
Small sales teams need a lightweight, focused tool to track leads through pipeline stages without the complexity, cost, or learning curve of Salesforce/HubSpot. Spreadsheets fail at role-based access and don't surface pipeline distribution; full CRMs are over-engineered for a small team's MVP needs.

### Target Users
- **Admin** — typically a sales manager / founder. Owns the data, manages users, sees all leads org-wide.
- **Salesperson** — individual contributor. Manages their own leads only; receives the weekly Monday digest.

### Business Value
- Single source of truth for lead pipeline (no more spreadsheet drift)
- Role-based isolation so reps see only their own leads (privacy + focus)
- Pipeline visibility for Admin via the analytics dashboard
- Proactive engagement via the weekly email digest (drives weekly lead-review cadence)

---

## Project Type

| Attribute | Value |
|-----------|-------|
| Type | Greenfield - New System |
| Quality Level | MVP (polished, not throwaway PoC) |
| Timeline | 4 weeks |
| Hard Deadline | Flexible — target 4 weeks from kickoff (2026-06-16) |
| Deployment | Local only (out of scope: cloud deploy) |
| Tenancy | Single organization (out of scope: multi-tenant) |

---

## Success Criteria (MUST HAVE)

| ID | Criterion | Measurement | Target |
|----|-----------|-------------|--------|
| SC-1 | Admin can create Salesperson user accounts | Manual UI walkthrough | Admin form creates user; user can log in immediately |
| SC-2 | Salesperson sees ONLY their own leads | API + UI test as Salesperson user | Other users' leads return 0 results / 403 on direct ID access |
| SC-3 | Admin sees ALL leads regardless of owner | UI test as Admin | All leads from all reps visible in the list/dashboard |
| SC-4 | Lead progresses through the 4 stages | Stage update test | UI/API allows transition between Evaluating → Proposing → Solutioning → Complete |
| SC-5 | Required lead fields enforced | Form validation test | Cannot save a lead missing opportunity name, contact person, est. close date, lead value |
| SC-6 | Analytics dashboard renders 2 bar charts | UI render check | "Total leads per person" + "Leads by stage" both visible with live data |
| SC-7 | Weekly Monday digest delivers to all active Salespersons | Scheduled job test in Mailtrap/local SMTP | Job fires Mondays 09:00 server-local; each Salesperson with ≥1 active lead receives an email |
| SC-8 | API auth required on every endpoint except `/auth/login` | Auth bypass test | Unauthenticated request → 401 on all non-login endpoints |
| SC-9 | Median list-leads API latency under 200ms (p95 < 500ms) | Load test with 1k leads in DB | Local benchmark with k6 or autocannon |
| SC-10 | Unit + integration test coverage ≥ 85% | `npm test -- --coverage` | Across backend + frontend |

---

## Failure Criteria (UNACCEPTABLE)

| ID | Criterion | Description |
|----|-----------|-------------|
| FC-1 | A Salesperson can read another Salesperson's leads | Data isolation breach — defeats the role model |
| FC-2 | Plain-text password storage | Passwords MUST be hashed (bcrypt or argon2) |
| FC-3 | Weekly digest never sends, fails silently | Cron/scheduler must log failures and be observable |
| FC-4 | Lead lost on stage transition or partial form save | Data loss is a release blocker |
| FC-5 | Dashboard charts show stale or wrong aggregations | Mismatched chart vs underlying data is a release blocker |
| FC-6 | App requires manual SQL editing to create the first Admin | Bootstrap must be scripted (seed) or guided (first-run flow) |

---

## Technical Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Frontend | React.js (latest stable, functional components + hooks) | Specified by user |
| Backend | Node.js (LTS) + Express (or Fastify) | Specified by user; Express assumed unless architect overrides |
| Database | SQLite (file-backed) | Specified by user; sufficient for MVP single-org scale |
| ORM/Query layer | TBD by architect (better-sqlite3, Prisma, or Knex) | Pick during architecture; must support migrations |
| Auth | JWT (HS256), bcrypt for password hashing | User-selected over sessions |
| Email | Nodemailer + configurable SMTP | User-selected; works with Gmail / SendGrid / Mailtrap via env vars |
| Charts | React chart library (TBD: Recharts / Chart.js) | Architect to pick; must render 2 bar charts |
| Scheduler | node-cron or BullMQ (lightweight cron) | For the weekly Monday job |
| Deployment | Local development only | Cloud deploy explicitly out of scope |

---

## Quality Gates

| Gate | Target | Required |
|------|--------|----------|
| Unit Test Coverage | ≥85% (backend + frontend combined) | Yes |
| Integration Tests | 100% pass; cover all auth + role-isolation paths | Yes |
| No Critical Bugs | 0 P0/P1 open at release | Yes |
| API Performance | p95 < 500ms on list-leads with 1k rows | Yes |
| Security: password storage | bcrypt with cost ≥ 10 | Yes |
| Security: JWT secret | Loaded from env, not hardcoded | Yes |
| Security: SQL injection | Parameterized queries only — no string concat | Yes |
| Code Review | Every PR approved by ≥1 reviewer (per branch protection) | Yes |
| Lint | ESLint clean on backend + frontend | Yes |

---

## Design References

**Location**: `SPEC/references/` (currently empty)

| File | Type | Description | Used In |
|------|------|-------------|---------|
| — | — | No reference designs provided at kickoff | — |

**Note**: UI/UX patterns will be defined in `aire-ui-ux-design`. Without a provided design, the UI/UX agent will produce a Tailwind-based design system inspired by Salesforce's clean list/detail patterns.

---

## Functional Requirements

### Feature: Authentication
**Priority**: Must Have

**User Story**: As a user, I want to log in with my email and password so that I can access the CRM with my role-appropriate data.

**Acceptance Criteria**:
- POST `/auth/login` accepts `{email, password}` and returns a signed JWT on success
- JWT contains `userId` and `role` claims
- Passwords are bcrypt-hashed at rest (cost ≥ 10)
- Failed login returns 401 with a generic message (no user-enumeration)
- JWT expires after 24h; refresh requires re-login (no refresh tokens for MVP)
- A seed script or first-run flow creates the initial Admin (no manual SQL required)

### Feature: User Management (Admin only)
**Priority**: Must Have

**User Story**: As an Admin, I want to create and deactivate Salesperson accounts so that I can manage who has access to the CRM.

**Acceptance Criteria**:
- Admin-only screen lists all users with role + active status
- Admin can create a new user with email, full name, role (Admin/Salesperson), and a generated/typed initial password
- Admin can deactivate a user (soft delete — `active=false`); deactivated users cannot log in
- Salespersons cannot reach any user-management endpoint (403)
- Email must be unique; validation enforced server-side

### Feature: Lead Management
**Priority**: Must Have

**User Story**: As a Salesperson, I want to create, update, and progress leads through pipeline stages so that I can track my deals.

**Acceptance Criteria**:
- Lead fields: `opportunity_name` (required), `notes` (optional, multi-line text), `contact_person` (required, free-text — first name + last name), `estimated_closing_date` (required, future date), `lead_value` (required, decimal ≥ 0), `stage` (enum, default "Evaluating"), `owner_id` (FK to users), `created_at`, `updated_at`
- Stages: `Evaluating`, `Proposing`, `Solutioning`, `Complete` (exact enum order)
- Stage transitions allowed in any direction (no enforced forward-only progression for MVP)
- Salesperson sees and edits only leads where `owner_id = self.id`
- Admin sees and edits all leads
- Lead list supports filter by stage and search by opportunity name (case-insensitive substring)
- Lead detail view shows all fields + owner name + last updated timestamp

### Feature: Analytics Dashboard
**Priority**: Must Have

**User Story**: As an Admin, I want to see pipeline distribution at a glance so that I can understand team workload and forecast.

**Acceptance Criteria**:
- Dashboard route accessible to Admin (full org data) and Salesperson (own data only)
- Bar chart 1: "Total leads per person" — x-axis = salesperson name, y-axis = lead count. Salesperson view shows only their own bar.
- Bar chart 2: "Lead distribution by stage" — x-axis = stage (Evaluating/Proposing/Solutioning/Complete), y-axis = lead count
- Both charts query live data on page load (no caching for MVP)
- Empty state rendered when no leads exist

### Feature: Weekly Monday Email Digest
**Priority**: Must Have

**User Story**: As a Salesperson, I want a weekly email summary of my active leads so that I remember to follow up.

**Acceptance Criteria**:
- Scheduled job runs every Monday at 09:00 server-local time
- For each active Salesperson with ≥1 lead **not in `Complete` stage**, send one email containing: opportunity name, stage, est. close date, lead value, last-updated timestamp — for every active lead
- Email subject: `Your active leads — week of YYYY-MM-DD`
- SMTP config via env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- Send failures are logged with recipient + error; the job continues to the next recipient (no all-or-nothing)
- A manual trigger endpoint (Admin-only) allows running the job on demand for QA: `POST /admin/digest/run`

---

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | List-leads API response time | p95 < 500ms @ 1k leads |
| Performance | Dashboard initial render | < 1.5s on localhost |
| Scalability | Concurrent users | 20 (single-org MVP) |
| Availability | Local dev only | N/A — runs on developer machine |
| Security | Passwords | bcrypt cost ≥ 10 |
| Security | JWT secret | env var, 32+ random chars |
| Security | SQL | Parameterized queries only |
| Security | Role isolation | Enforced server-side; never trust client claims |
| Accessibility | WCAG 2.1 AA on key flows (login, lead form, dashboard) | Keyboard navigable, label semantics |
| Observability | Backend logs | Structured JSON logs to stdout |
| Internationalization | English only for MVP | N/A — i18n is OUT of scope |

---

## Explicit Scope

### IN Scope ✅
- User authentication (login/logout) with JWT
- Admin creates/deactivates Salesperson accounts
- Lead CRUD with the 5 fields and 4 stages
- Role-based data scoping (Salesperson = own leads; Admin = all)
- Analytics dashboard with 2 bar charts
- Automated Monday email digest via Nodemailer + SMTP
- Manual digest trigger for QA (Admin only)
- Local development setup (npm scripts, SQLite file, seed Admin)

### OUT of Scope ❌
- Contacts/companies as separate entities (contact stays as free-text on the lead)
- Activity/task tracking beyond the `notes` field (no call logs, meetings, timeline)
- File/document attachments on leads
- Multi-tenancy (single shared org only)
- Cloud deployment, CI/CD pipeline (DevOps workflows are separate)
- Password reset / email verification flows
- Refresh tokens / SSO / OAuth
- Real-time updates (no websockets)
- Mobile-native apps (responsive web only)
- Audit log / change history per lead
- Export to CSV / PDF reports
- Bulk lead import
- i18n / localization
- Custom fields per org

### Future Considerations (Not This Epic)
- Contacts and Companies as first-class entities
- Activity timeline (calls, meetings, emails)
- Pipeline forecasting (weighted by stage probability)
- CSV import/export
- Cloud deploy + multi-tenant
- SSO / OAuth integrations

---

## Assumptions

| Assumption | Impact if Wrong |
|------------|-----------------|
| 4-week timeline is acceptable for stated scope | Need to descope features or extend timeline |
| Single Admin user is sufficient at MVP | Need a multi-Admin invite flow (cheap fix) |
| Server-local time is fine for the Monday job | Need timezone-per-user logic (significant rework) |
| Lead value is single-currency (USD assumed) | Need multi-currency support |
| SMTP credentials will be available for testing (Mailtrap is fine) | Cannot validate SC-7 end-to-end without SMTP access |
| ~1k leads is a realistic MVP scale ceiling | If 10k+, may need indexes/pagination tuning |
| Stage transitions are bidirectional | If forward-only is required, add server-side guard |
| First-user-is-Admin pattern is unacceptable (Admin must be seeded) | Trivial swap if user later prefers self-signup |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Role-isolation bug leaks leads across Salespersons (FC-1) | Medium | High | Server-side scoping in every query; integration tests with two-user fixtures |
| Cron job never fires in dev (system asleep / process not running) | High | Medium | Document `npm run digest:run` for manual triggers; in-process scheduler tied to the API server lifecycle |
| SQLite write contention under concurrent users | Low | Medium | Use WAL mode; serialize writes via better-sqlite3 |
| JWT secret committed to git by accident | Medium | High | `.env.example` only; `.env` in `.gitignore`; secret scanning in CI |
| Chart library bundle bloat slows initial load | Low | Low | Prefer Recharts (tree-shakeable) or lazy-load the dashboard route |
| 4-week timeline slips due to scope underestimation | Medium | High | Track via build cycles; cut Analytics or Email job to a "polish" phase if needed |

---

## Timeline

| Milestone | Date | Deliverables |
|-----------|------|--------------|
| Requirements Complete | 2026-05-19 | This document |
| Architecture Complete | 2026-05-23 | `docs/architecture/design/00-system-architecture-greenfield.md` |
| Patterns Complete | 2026-05-24 | `docs/architecture/design/01-patterns-and-standards-greenfield.md` |
| UI/UX Spec Complete | 2026-05-26 | `docs/ui-ux/ui-ux-spec.md` |
| Build Cycles Defined | 2026-05-27 | `docs/plans/builds/` |
| Implementation Plan | 2026-05-28 | `docs/plans/implementation-plan.md` |
| Implementation Complete | 2026-06-12 | Working code, ≥85% coverage |
| QA + Review Complete | 2026-06-16 | Test reports, no P0/P1 open |
| MVP Release (local) | 2026-06-16 | Tagged release on `main` |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Stakeholder | abhigyan.ranjan@3pillarglobal.com | 2026-05-19 | Pending |
| Technical Lead | (TBD) | — | Pending |
