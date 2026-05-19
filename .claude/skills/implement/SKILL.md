---
name: implement
description: Execute implementation of a story from the implementation plan using TDD. Use when user says 'implement story X.Y', 'implement next story', or 'dev-implement'. Follows strict TDD with ≥85% test coverage requirement.
argument-hint: [story-number | "next story"]
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# DEV - Implement Story

You are implementing a story from the AIRE SDLC Agentic Framework Method implementation plan using Test-Driven Development.

## Story to Implement

Story: $ARGUMENTS

## Before Starting

1. Read `SPEC/agents/AIRE_DEV.md`
2. Read `SPEC\workflows\aire-dev-implement.md`
3. Read `SPEC/rulebooks/aire-implementation-rulebook.md`
4. Read `docs/plans/implementation-plan.md`
5. Read relevant pattern docs from `docs/architecture/`
6. Identify the specific story requirements from implementation plan

## Process

### Phase 1: Preparation
- [ ] Read story requirements from implementation plan
- [ ] Read context files and dependencies
- [ ] Review architectural patterns
- [ ] Confirm understanding with user: **Ask "Type 'proceed' to start"**

### Phase 2: Implementation (TDD Approach)

Execute action items **IN ORDER**:

- [ ] **Write unit tests FIRST** (TDD approach - tests before code)
- [ ] Implement code to pass tests (zero lint errors)
- [ ] Run unit tests: **MUST pass 100%**
- [ ] Write integration/E2E tests if applicable
- [ ] Run ALL tests: **MUST pass 100%**
- [ ] Check coverage: **≥85% required**
- [ ] Verify no lint warnings/errors

### Phase 3: Documentation

- [ ] Update `docs/plans/implementation-plan.md` status with evidence
- [ ] Create `docs/stories-implemented/story-$ARGUMENTS-review.md` with:
  - **Actual test output** (paste full logs)
  - **Coverage report** (paste actual numbers)
  - **Linter results** (paste output)

## Critical Rules

🔴 **NEVER SKIP THESE:**

- **Tests WITH code** - never postpone (TDD)
- **Run ALL tests** after every change
- **Execute items IN ORDER** - no skipping
- **Update status with EVIDENCE** - paste actual test output + coverage
- **No TODO comments** in production code
- **Zero lint errors** allowed
- **Never skip action items**

## Output

After completing the story, present this summary:

```
✅ Story $ARGUMENTS Complete!

📊 Evidence:
- Tests: [X/X passing]
- Coverage: [XX%]
- Linter: [Clean/Issues]

📁 Files:
- Implementation: [list files]
- Tests: [list test files]
- Review: docs/stories-implemented/story-$ARGUMENTS-review.md

What would you like to do next?

1️⃣  **review-code** - Request code review for this story
2️⃣  **qa-test-plan** - Create test plan against requirements
3️⃣  **implement next story** - Continue to next story
4️⃣  **pause** - Take a break, resume later

Type your choice (e.g., "review-code" or "implement next story")
```

## If User Says "implement next story"

1. Read `docs/plans/implementation-plan.md`
2. Find the last completed story
3. Identify the next story in sequence
4. Implement that story following the same process

---

**Remember**: TDD means tests FIRST, then code. Always run ALL tests before marking complete.
