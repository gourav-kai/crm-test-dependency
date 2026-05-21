---
copyright: "Copyright © 2026 3Pillar Global, Inc."
license: "Proprietary - 3Pillar Background IP"
date: "2026-04-24"
component: "3Pillar AIRE SDLC Agentic Framework"
legal_notice: |
  PROPERTY OF 3PILLAR GLOBAL, INC. - CONFIDENTIAL & PROPRIETARY

  Component: 3Pillar AIRE SDLC Agentic Framework
  Copyright © 2026 3Pillar Global, Inc. All Rights Reserved.

  This file contains 3Pillar Pre-Existing Materials. When used in client deliveries, this component is licensed pursuant to the Master Services Agreement between 3Pillar Global and the client.

  USE RESTRICTIONS:
  Unauthorized use, reproduction, or distribution is strictly prohibited.
---

# Implementation Rulebook

## Purpose

Strict rules for code implementation by DEV agents, incorporating full Definition of Done (DoD) standards.

---

## Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Test-Driven** | Tests WITH code, never postponed (TDD) |
| **Pattern-Adherent** | Follow documented patterns exactly |
| **Evidence-Based** | All work backed by test output and lint reports |
| **Incremental** | Small changes, verified continuously |
| **Clean Exit** | No secrets, no lint warnings, no breaking changes |

---

## Absolute Rules & Constraints

| Priority | Rule | Description |
|----------|------|-------------|
| 🔴 CRITICAL | CONFIRM BEFORE CODING | Read requirements first, summarize scope, ask "proceed?" and HALT. Do NOT code before confirmation. |
| 🔴 CRITICAL | ONE STORY RULE | Implement exactly ONE story per invocation. Present completion, HALT, and wait for user choice. |
| 🔴 CRITICAL | NO SELF-SKIP | NEVER skip stories on agent judgment (e.g., "no code needed"). Present assessment and let user decide. |
| 🔴 CRITICAL | TESTS WITH CODE | Never implement without tests (TDD). Implement tests alongside code, never postpone. |
| 🔴 CRITICAL | RUN ALL TESTS | Run the full test suite (Unit, Integration, E2E) after every single change. |
| 🔴 CRITICAL | NEVER SKIP ITEMS | Execute every action item in the exact order specified. |
| 🔴 CRITICAL | UPDATE STATUS | Track progress and update status with evidence (test output + coverage). |
| 🔴 CRITICAL | NO ASSUMPTIONS | Clarify before assuming. Ask if anything is unclear. |
| 🔴 CRITICAL | ZERO SECRETS | Use env vars; never commit API keys or hardcoded credentials. |
| 🔴 CRITICAL | NO LINT ERRORS | Zero warnings or errors allowed in production code. |
| 🔴 CRITICAL | NO TODO COMMENTS | Production code must be complete with no TODOs. |
| 🟡 REQUIRED | APPLY SOLID & NO MONOLITHS| Follow SOLID principles. No god classes, no 500+ line files, no tight coupling. |
| 🟡 REQUIRED | FOLLOW PATTERNS | Use error handling, logging, and naming patterns from architecture docs. |
| 🟡 REQUIRED | BACKWARD COMP | No breaking changes without a migration plan. |
| 🟡 REQUIRED | SELF-REVIEW | Document lessons learned after each story. |
| 🟡 REQUIRED | WRITE ONLY TO | Restrict modifications to production code directories and `docs/stories-implemented/`. |

---

## Execution Order

Every implementation story follows this sequence:

1. Read plan story requirements and context files
2. Review patterns from docs
3. Confirm understanding with user
4. Write unit tests first (AAA pattern)
5. Implement code (pass tests + no lint errors)
6. Run unit tests (must pass)
7. Write/Run integration and E2E tests
8. Verify environment (update .env.example if needed)
9. Update status with evidence (test logs + coverage)
10. Update documentation (API docs, README, Diagrams)
11. Write self-review document

---

## Code Standards

### Functions
- Maximum 20-30 lines
- Single responsibility
- Maximum 3-4 parameters
- Descriptive names (verb + noun)

### Error Handling
- Use typed errors
- Never swallow errors
- Log with context
- User-friendly messages

### Naming & Security
- Descriptive variable names (no single-letters except loops)
- No secrets in code (use environment variables)
- Consistent conventions

### Documentation
- Explain WHY, not WHAT
- Document public classes and methods (params, returns, errors)
- No commented-out code
- No TODO/FIXME in production

---

  ## Definition of Done — Compliance Gates (MANDATORY)                                                             
   
  Tests-green ≠ spec-met. A story is NOT ✅ Done until every gate below passes.                                    
  Paste evidence into `docs/stories-implemented/story-N.M-review.md` under "## DoD Evidence".

  ### Gate 1 — Spec Echo
  For every requirement in the story (Acceptance Criteria, Quality Checks, Design Tokens,
  constraints, "must", "must not", numeric thresholds, named patterns), cite the
  `file:line` (or command + output) that proves it. No blanks, no "implicit",
  no "covered by tests". One row per requirement.

  ### Gate 2 — Negative-Space Check
  For every "must NOT" / "no X in Y" / "out of scope" rule, run a check that would
  fail if violated and paste the result. The check format is your choice (grep,
  lint rule, test, manual diff) — but it must be reproducible by another agent.

  ### Gate 3 — Contract Consistency
  Where a story defines two or more layers (input/output, request/response,
  producer/consumer, schema/handler, doc/code), list them side-by-side and verify
  each element on one side has a matching, intentional behavior on the other.
  Silent acceptance, silent ignore, or silent default = bug.

  ### Sign-off rule
  If any gate fails, story stays 🟡 In Progress. Status.md must NOT flip to ✅ Done.


## Test Standards

### Unit & Integration Tests
- **TDD Non-negotiable**: Tests written before code
- **AAA Pattern**: Arrange/Act/Assert
- **Behavioral Naming**: Names express behavior, not implementation
- **Edge Cases**: Test null, empty, and boundary values
- **Mocks**: Only for external boundaries (API/DB), not internal logic

### Coverage
- Minimum 85% overall
- 100% of new business logic covered
- Meaningful tests (not just coverage)

---

## Evidence Requirements

Status updates MUST include:
- Test command output (copy/paste)
- Coverage percentage and passing test count
- Linter execution output (confirming 0 errors)
- Any failures and resolution

---

## Quality Gates

| Gate | Target | Description |
|------|--------|-------------|
| Unit Test Coverage | ≥85% | All new code |
| All Tests Passing | 100% | Unit, Integration, and E2E |
| Linter Status | Clean | Zero warnings or errors |
| No TODO Comments | 0 | Production ready |
| Secret Check | Passed | No hardcoded credentials |
| Pattern Compliance | 100% | All patterns followed |
| Self-Review | Required | Document created with evidence |

---
 ## Red Flags

| Red Flag | What You Do |
|----------|-------------|
| "Just copy this pattern" | Understand WHY before copying |
| "This test is flaky" | Fix the flakiness, don't skip it |
| "We'll add tests later" | No. Tests go in now. |
| "It works on my machine" | That's not a deployment strategy |
| "The plan doesn't cover this" | Stop, ask Architect/PM |
| Requirements feel ambiguous | Clarify before implementing |
| "Quick fix" | Take the time to do it right | 

---

## Parallel Subagent Contract

Workflows that support parallel mode (`aire-dev-implement`, `aire-dev-remediate`, `aire-review-code`, `aire-qa-validate`, `aire-qa-triage`) spawn one subagent per story when the dependency graph permits. The following contract is binding on every subagent:

1. **One Story Rule still holds at the subagent level.** One subagent implements/reviews/validates/triages exactly one story. Parallel mode = N subagents, each handling exactly one story.
2. **A parent agent may spawn multiple such subagents concurrently** when `docs/plans/dependency-graph.yml` shows their dependencies are satisfied AND their `files_touched` are disjoint modulo `shared_files`.
3. **Subagents MUST read `docs/plans/dependency-graph.yml` first** and refuse to touch any file outside their own story's `files_touched`. On any out-of-bounds file write attempt, the subagent aborts and reports.
4. **Subagents MUST NOT write to `docs/status.md` directly.** They append a single line to `docs/status/events.log` on start and on completion. The parent reconciles `docs/status.md` from the event log.
5. **Subagents MUST NOT write to any file in `shared_files`** (e.g. `package.json`, central route registry, migrations index). Those edits are serialized by the parent.
6. **Subagents MUST NOT call Jira / GitHub MCP tools.** External writes (status updates, comments, issue creation) stay parent-agent-only and require explicit user confirmation.
7. **Parent post-flight check**: after each subagent returns, the parent runs `git diff --name-only` and verifies the subagent stayed within its declared `files_touched`. On violation, the parent reverts that story's changes and flags the user.

## Forbidden Actions

- 🚫 Skipping tests or writing them after code
- 🚫 Hardcoding secrets or API keys
- 🚫 Committing code with linter warnings
- 🚫 Skipping action items or changing order
- 🚫 Making assumptions without asking
- 🚫 (Parallel mode) Editing files outside the subagent's `files_touched` declaration
- 🚫 (Parallel mode) Subagents writing to `docs/status.md`, Jira, or GitHub