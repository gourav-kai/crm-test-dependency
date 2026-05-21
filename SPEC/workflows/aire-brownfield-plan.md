---
copyright: "Copyright © 2026 3Pillar Global, Inc."
license: "Proprietary - 3Pillar Background IP"
date: "2026-04-24"
component: "3Pillar AIRE SDLC Agentic Framework"
description: Brownfield - Implementation Planning. Create detailed execution plan with stories from requirements.
legal_notice: |
  PROPERTY OF 3PILLAR GLOBAL, INC. - CONFIDENTIAL & PROPRIETARY

  Component: 3Pillar AIRE SDLC Agentic Framework
  Copyright © 2026 3Pillar Global, Inc. All Rights Reserved.

  This file contains 3Pillar Pre-Existing Materials. When used in client deliveries, this component is licensed pursuant to the Master Services Agreement between 3Pillar Global and the client.

  USE RESTRICTIONS:
  Unauthorized use, reproduction, or distribution is strictly prohibited.
---

# Brownfield - Implementation Plan

## Agent

**PRODUCT_OWNER** 

## Before Starting

1. Read `SPEC/agents/AIRE_PRODUCT_OWNER.md`
2. Read `SPEC/rulebooks/aire-brownfield-rulebook.md`
3. **CRITICAL**: Read `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md` for mandatory format
4. Read `docs/requirements.md`
5. Read `docs/architecture/current/00-system-overview.md`
6. Read all `docs/architecture/current/01-*-deep-dive.md` files
7. **Read**: `docs/architecture/design/02-target-architecture-brownfield.md`.
8. **Read**: `docs/architecture/design/03-patterns-and-standards-brownfield.md`.
9. **OPTIONAL UI/UX**: Ask user if UI/UX design needed
10. **IF UI/UX DONE**: Read `docs/ui-ux/ui-ux-spec.md` for design tokens
11. **SEQUENTIAL NUMBERING**: Check for existing epics/stories and ask user for starting numbers
12. **BUILD CYCLE CHECK** *(optional)*: Check if `docs/plans/builds/` exists. If it does, follow build-cycle integration below. If it does not, ask the user: "No build cycles found. Run `aire-build-cycles` first, or proceed without cycles? (cycles are optional)". If user proceeds without, skip BUILDID assignment entirely.

---

## STEP 0: Prerequisites Check (ALWAYS DO THIS FIRST)

Before anything else, verify ALL required inputs exist:

1. **Check for requirements**: `docs/requirements.md`
2. **Check for system overview**: `docs/architecture/current/00-system-overview.md`
3. **Check for deep-dive analysis**: `docs/architecture/current/01-*-deep-dive.md`
4. **Check for target architecture**: `docs/architecture/design/02-target-architecture-brownfield.md`
5. **Check for patterns & standards**: `docs/architecture/design/03-patterns-and-standards-brownfield.md`

**If requirements are missing**:
```
❌ docs/requirements.md not found
   → Please run: aire-brownfield-requirements
```

**If system overview or deep-dive are missing**:
```
❌ docs/architecture/current/ not found or empty
   → Please run: aire-brownfield-inspect then aire-brownfield-deep-dive
```

**If target architecture is missing**:
```
❌ docs/architecture/design/02-target-architecture-brownfield.md not found
   → Please run: aire-brownfield-architecture
```

**If patterns & standards are missing**:
```
❌ docs/architecture/design/03-patterns-and-standards-brownfield.md not found
   → Please run: aire-brownfield-patterns
```

**If ALL exist**, confirm and continue:
```
✅ Prerequisites found:
   ✓ Requirements: docs/requirements.md
   ✓ System overview: docs/architecture/current/00-system-overview.md
   ✓ Deep-dive: docs/architecture/current/[files found]
   ✓ Target architecture: docs/architecture/design/02-target-architecture-brownfield.md
   ✓ Patterns & standards: docs/architecture/design/03-patterns-and-standards-brownfield.md

Proceeding to implementation planning...
```

---

## STEP 1: Epic/Story Numbering (ALWAYS DO THIS FIRST)

**CRITICAL**: Before creating the implementation plan, determine the starting epic/story numbers.

### Check Existing Implementation Plan

1. **Read the existing plan** (if it exists):
   - Check if `docs/plans/implementation-plan.md` exists
   - If it exists, read the entire file
   - Find all Epic headers: `## EPIC N:` or `# Epic N:`
   - Find all Story headers: `### Story N.M:` or `## Story N.M:`
   - Also scan `docs/plans/stories/` for existing story files
   - Identify the **highest Epic number** and **highest Story number**

2. **Determine next numbers**:
   - If **no implementation plan exists**: Start from Epic 1, Story 1.1
   - If **plan exists with Epic X, Story X.Y as last**:
     - For adding stories to same epic: Epic X, Story X.(Y+1)
     - For new major feature: Epic (X+1), Story (X+1).1

3. **Ask User to Confirm**:
   ```
   📊 Current Implementation Plan Status:

   [If plan exists]
   ✓ Found existing implementation-plan.md
   ✓ Last Epic: Epic X
   ✓ Last Story: Story X.Y

   [If no plan exists]
   ℹ️  No existing implementation-plan.md found
   ℹ️  This will be the first implementation plan

   💡 Recommended Starting Point:

   For brownfield projects (adding features to existing code):
   - ALWAYS continue sequentially: Epic (X+1), Story (X+1).1

   Options:
   1. Start new epic (Epic [X+1], Story [X+1].1) - recommended for new feature
   2. Continue in current epic (Epic [X], Story [X.Y+1]) - only if extending same feature
   3. Specify custom epic/story numbers

   Which option? (1-3):
   ```

4. **Confirm Final Numbers**:
   ```
   ✅ Confirmed: Starting from:
   - First Epic: [N]
   - First Story: [N.1]

   Ready to proceed? (yes/no)
   ```

### CRITICAL Rules for Sequential Numbering

- ✅ **ALWAYS continue sequentially** - never reset to Epic 1, Story 1.1 unless truly the first plan
- ✅ **Read the file first** - don't guess, actually read `docs/plans/implementation-plan.md`
- ✅ **Ask user to confirm** - show what you found and what you'll use
- ❌ **NEVER reset numbering** - brownfield projects build on existing work
- ❌ **NEVER overwrite** existing epics - always increment

---

## BUILD CYCLE INTEGRATION (BUILDID)

**CRITICAL**: If build cycles have been planned (via `aire-build-cycles`), every story MUST carry a BUILDID.

### Detect Active Cycle

1. Check if `docs/plans/builds/` directory exists
2. If it exists, list all `docs/plans/builds/cycle-[N]/cycle-plan.md` files
3. Ask user:

```
Build cycles detected:
  - Cycle 1 (CYCLE-1): [scope from cycle-plan.md]
  - Cycle 2 (CYCLE-2): [scope from cycle-plan.md]
  ...

Which cycle are you planning stories for?
Enter cycle number (e.g., 1 for CYCLE-1):
```

4. Set `BUILDID = CYCLE-[N]` for all stories in this planning session
5. Read the corresponding `docs/plans/builds/cycle-[N]/cycle-plan.md` to scope the stories

### BUILDID in Story Files

Every story file MUST include the BUILDID and Jira traceability in the header:

```
### Story N.M: [Title]

**BUILDID**: CYCLE-[N] | **Epic**: N - [NAME] | **ID**: N.M | **Date**: [YYYY-MM-DD] | **Jira**: [JIRA-ID]
```

### Jira Traceability (MANDATORY)

**CRITICAL**: Check `docs/requirements.md` for the "Jira Stories Imported" table. If requirements were sourced from Jira (Path J in `aire-brownfield-requirements`), every story that maps to an imported Jira issue MUST carry the original Jira ID.

- **Jira-sourced story**: `**Jira**: PROJ-101` (exact Jira issue key from requirements.md)
- **Locally-created story** (no Jira origin): `**Jira**: LOCAL`
- **Story covering multiple Jira issues**: `**Jira**: PROJ-101, PROJ-102`

This traceability is used in Phase 4 to determine export behavior.

### If No Build Cycles Exist

If `docs/plans/builds/` does not exist or is empty, skip BUILDID assignment. Stories are created without BUILDID (backwards compatible).

---

## MANDATORY FORMAT

**You MUST follow the exact format specified in `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md`**

This ensures:
- ✅ Each story contains complete implementation details
- ✅ Code examples are included in every story
- ✅ Test requirements are comprehensive
- ✅ Each story file is self-contained — AI agents have full context without loading the entire plan

---

## Execution Steps:

### Phase 1: Plan Structure

- [ ] Read `docs/requirements.md` — all features, success criteria, scope
- [ ] Read `docs/architecture/current/` — system overview + deep-dive patterns
- [ ] If BUILDID set: scope stories to the active cycle's plan only

#### 1a — Check for Jira Stories Table in Requirements

- [ ] Check if `docs/requirements.md` contains a **"Jira Stories Imported"** table
- [ ] If YES (Jira-sourced requirements): use **1:1 Jira Story Mapping** (see below)
- [ ] If NO (local requirements): use **Vertical Slice Planning** (see below)

#### 1b — Jira-Sourced: 1:1 Story Mapping (when requirements have Jira table)

When `docs/requirements.md` has a "Jira Stories Imported" table, create **one implementation story file per Jira story**:

- [ ] Read the Jira Stories table — each row = one implementation story
- [ ] Group stories by Epic (use the Jira Epic column, or group by theme from Functional Requirements)
- [ ] For each Jira story, create a matching implementation story that:
  - Preserves the original Jira ID in the header (`**Jira**: PROJ-101`)
  - Uses the original Jira title as the story title
  - Keeps original Description, AC, Out of Scope from requirements.md
  - Derives implementation steps, prerequisites, patterns, tests from architecture docs
- [ ] Assign sequential epic/story numbers (from STEP 1 numbering)
- [ ] Each story carries the BUILDID if cycles are active

**Story file header format for Jira-sourced stories:**

```
### Story N.M: [ORIGINAL JIRA TITLE — unchanged]

**BUILDID**: CYCLE-[N] | **Jira**: [JIRA-ID] | **Epic**: N - [NAME] | **ID**: N.M | **Date**: [YYYY-MM-DD]
```

**Example mapping:**

```
Jira Stories from requirements.md:
  PROJ-101: "Export leads to CSV"        → Epic 1, Story 1.1 (CYCLE-1, Jira: PROJ-101)
  PROJ-102: "PDF report for leads"       → Epic 1, Story 1.2 (CYCLE-1, Jira: PROJ-102)
  PROJ-103: "Email notification system"  → Epic 2, Story 2.1 (CYCLE-1, Jira: PROJ-103)
  PROJ-104: "Dashboard analytics"        → Epic 3, Story 3.1 (CYCLE-2, Jira: PROJ-104)
```

#### 1c — Local Requirements: Vertical Slice Planning (when no Jira table)

When `docs/requirements.md` was created locally (PATH L), define epics using **VERTICAL FEATURE SLICES**:

- [ ] Each epic = ONE complete feature across ALL layers
- [ ] Within each epic, order stories: Backend API → Frontend UI → Integration/Wiring
- [ ] Break into stories (1-4 hours each)
- [ ] Each story gets `**Jira**: LOCAL` in the header

**❌ FORBIDDEN (Horizontal/Layer-Based)**:

```
Epic 1: Add All Backend Features
  Story 1.1: Webhook receiver
  Story 1.2: All API endpoints

Epic 2: Add All Frontend Features
  Story 2.1: Dashboard scaffolding
  Story 2.2: All components

Problem: Nothing testable until everything is connected
```

**✅ REQUIRED (Vertical/Feature-Based)**:

```
Epic 1: Repository Management (Complete Feature)
  Story 1.1: Repository API (Backend - CRUD endpoints)
  Story 1.2: PAT Storage (Backend - secure token storage)
  Story 1.3: Repository Form (Frontend - add repo UI)
  Story 1.4: Repository List (Frontend - display repos)
  Story 1.5: Integration Test (End-to-end repo management)
  ✅ TESTABLE: User can add/view/delete repositories
```

### Phase 1.5: Story-Dependency Graph (MANDATORY when plan has 2+ stories)

Before writing story files, produce `docs/plans/dependency-graph.yml` co-authored by AIRE_ARCHITECT and AIRE_PRODUCT_OWNER. The graph drives parallel execution in `aire-dev-implement` and downstream workflows.

**Story-file authoring stays one-at-a-time.** This phase does NOT add parallel story-file writing.

Steps:

1. **Ask `team_size` once:**
   ```
   ❓ How many developers will be working on this project?
      (Used to size waves and — for Jira-sourced plans — to validate that we
       have enough distinct assignees for parallel work. Not a runtime
       concurrency cap.)
   ```

2. **For each story, populate the graph entry:**
   - `requires`: architecture-natural ordering, informed by module dependencies discovered in the deep-dive.
   - `enables`: reverse edges (informational).
   - `files_touched`: from AIRE_ARCHITECT's File/Module Boundary Map in the brownfield patterns doc, intersected with the existing module each story touches.
   - `assignee`: copy from `docs/requirements.md` "Jira Stories Imported" table (the Assignee column). When multiple, take the first; PRODUCT_OWNER may reassign with explicit user confirmation. Set `null` when unassigned.
   - `jira`: copy the Jira ID for Jira-sourced stories; else `LOCAL`.

3. **Identify `shared_files` (BLOCKING — do NOT skip).** This step is the #1 source of broken graphs. Follow the procedure exactly:

   **3.1 Auto-detect overlap candidates.** Walk every story's `files_touched` and build a frequency map: any file path appearing in **2 or more** stories is a candidate. List candidates explicitly to the user — do not silently filter.

   **3.2 Add the always-shared baseline + brownfield-specific files.** Regardless of overlap, the following must be in `shared_files` if they exist in this project:
   - Every `package.json` (root + per-workspace)
   - Every `tsconfig*.json`, `vite.config.*`, `vitest.config.*`, `next.config.*`, lockfiles
   - Lint/format configs (`.eslintrc*`, `.prettierrc*`, `biome.json`)
   - Central route registries (discovered during deep-dive — use ACTUAL paths in this codebase)
   - Root app bootstrap files (discovered during deep-dive)
   - Migrations index directory (discovered during deep-dive)
   - Shared type/interface barrel files
   - Root config (`.env.example`, `.gitignore`, `README.md`, base tsconfig)
   - CI / DevOps shared files (existing `.github/workflows/*`, `Dockerfile`, `docker-compose.yml`)
   - **Brownfield-specific**: any DI container / IoC registry, any plugin registration file, any feature-flag registry — these typically already exist in the codebase and ARE shared.

   **3.3 Present the consolidated `shared_files` list to the user for explicit confirmation:**
   ```
   📦 Proposed `shared_files` ([N] entries):
     - package.json
     - backend/src/routes.ts        (from deep-dive: central route registry)
     - frontend/src/router.tsx      (from deep-dive: app router)
     - …
   Any to add or remove? (proceed / list additions or removals)
   ```
   Block until the user responds.

   **3.4 BLOCKING SELF-CHECK before writing the graph.** Compute, for each pair of stories in the same wave, whether their `files_touched` overlap on a file NOT in `shared_files`. If any overlap exists:
   - If the file is genuinely shared across the system → ADD it to `shared_files`.
   - If only those two stories touch it → SPLIT the stories or merge them; do NOT add a one-off file to `shared_files` as a workaround.
   - Re-run the check. Only proceed to step 4 when zero illegal overlaps remain.

   **3.5 Empty `shared_files` is forbidden for any plan with 2+ stories.** If the workflow ends step 3 with `shared_files: []`, that is a planning failure — STOP and re-run step 3.1.

3a. **Auto-assign per developer (when `team_size >= 2`) — optimize for PER-DEV parallelism, not by layer.** Ask the user:

   ```
   You said team_size=N. Want me to draft per-dev story assignments now?
     1) Yes — propose an assignment that maximizes each dev's self-parallel moments
        (Jira-fixed assignees are kept; everything else is optimized for parallelism)
     2) No — leave assignee null (or Jira default); assignment happens at run time
   ```

   **Do NOT default to a layer split (one dev = backend, other = frontend).** Instead, optimize the assignment so each dev's queue maximizes **self-parallel moments** (points in time where ≥2 of that dev's stories are simultaneously ready).

   **Assignment heuristic — apply in this order:**

   1. **Carry over Jira/explicit assignees as fixed.** Anything Jira already pinned stays unless the user explicitly overrides.
   2. **Identify "parallel triples"** — sets of 2+ stories that become ready at the same time and have disjoint `files_touched`. Assign all stories in a triple to the **same dev** so they can fan those out via mode 2 on one machine.
   3. **Balance queue length within ~20%** across devs.
   4. **Respect role hints only if the user provides them.** Otherwise let stories flow to whichever dev needs to balance.
   5. **Cross-feature stories prefer different devs only when** doing so doesn't break a parallel triple.

   Present the draft + parallelism analysis (step 5 below):

   ```
   📋 Proposed assignment (team_size=N):
     - alice@org.com (7 stories, 2 self-parallel moments): 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1
     - bob@org.com   (7 stories, 2 self-parallel moments): 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2

   Confirm? (yes / revise — tell me which stories to reassign)
   ```

   On confirmation, write the `assignments:` block AND populate each story's `assignee` field accordingly. The two must stay consistent — `aire graph-check` enforces it.

4. **Validate disjoint-files across each wave** — if same-wave stories overlap on a non-shared file, return to Architect to split.

5. **Compute waves** by topological layering.

6. **Write `docs/plans/dependency-graph.yml`** following the schema in `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md`.

6a. **Run `aire graph-check` (BLOCKING).** Immediately after writing the YAML, invoke `aire graph-check`. If it reports any errors, STOP — fix the graph and re-run. Do not advance to step 7 until `graph-check` passes with zero errors. Warnings should be reviewed but do not block.

7. **Add `## Dependency Graph` section at the top of `docs/plans/implementation-plan.md`** with a Mermaid `graph TD` mirror + a wave summary table. "If Mermaid drifts from YAML, YAML wins."

8. **Show the graph + per-dev parallelism analysis and confirm:**

   Compute and display:

   - **Global graph stats**: total stories, wave count, largest wave, root-independent count, longest chain depth, distinct assignees.
   - **Per-developer parallelism analysis** (when `assignments:` exists): for each dev, list queue length, sequential chains, self-parallel moments, estimated wall-clock in story-units.

   ```
   📊 Dependency Graph
      - Total stories: K
      - Waves: W (largest wave = M stories)
      - Independent at root: R
      - Longest dependency chain: L stories deep
      - Assignees: [distinct assignee names]

   👥 Per-dev parallelism analysis (team_size=N):

      alice@org.com (7 stories):
        - Sequential chains: 1.1→2.1→3.1 (3)
        - Self-parallel moments: 2 (max 3 ready at once)
        - Estimated wall-clock: ~4 story-units

      bob@org.com (7 stories):
        - Sequential chains: 1.2→2.2 (2)
        - Self-parallel moments: 2 (max 3 ready at once)
        - Estimated wall-clock: ~4 story-units

      Balance: ✅ even (7/7)
      Critical path: alice's chain 1.1→2.1→3.1 = 3 story-units

      Proceed to story file authoring? (yes / revise graph / reassign stories)
   ```

   If the analysis shows poor balance (one dev's wall-clock > 2× the other) or zero self-parallel moments for either dev, flag it explicitly:

   ```
   ⚠️ bob@org.com has 0 self-parallel moments — every one of their stories
      sits in a sequential chain. They'll never benefit from mode 2.
      Consider reassigning some stories from alice to flatten bob's queue.
   ```

   Block until the user confirms `yes`. On `reassign`, loop back to step 3a.

### Phase 2: Detail Each Story

For each story (whether Jira-sourced or local), follow `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md` and include:

- [ ] **Must Read Reference Files** (images, specs, designs from `SPEC/references/`)
- [ ] **Design Tokens and Icons to Use** (for frontend stories — from `docs/ui-ux/ui-ux-spec.md` if exists)
- [ ] Epic context (Epic number, Story ID, Date, BUILDID if set, **Jira ID** if Jira-sourced)
- [ ] **Requires / Enables / Files Touched / Assignee** — MUST mirror `docs/plans/dependency-graph.yml`
- [ ] **Story Description** (detailed explanation of what the story does, what it achieves, and why it matters — placed at the top of the story; for Jira-sourced: use original Jira description and expand with additional context)
- [ ] Acceptance Criteria (comprehensive — cover every functional, edge-case, and validation scenario; include as many as needed to fully define "done"; for Jira-sourced: preserve original ACs from Jira, then add derived ones)
- [ ] Prerequisites (inferred from deep-dive module dependencies)
- [ ] Context files to read (exact paths from the codebase)
- [ ] Patterns to follow (from `docs/architecture/design/03-patterns-and-standards-brownfield.md` if it exists, otherwise from deep-dive pattern catalog — include migration notes for [New adoption] patterns where relevant)
- [ ] **Implementation Steps** (derived from target architecture + story description + AC, WITH code examples aligned to chosen patterns)
- [ ] **Test Requirements** (derived from existing test patterns, WITH code examples)
- [ ] Quality Checks (ESLint, coverage, etc.)
- [ ] Explicitly OUT of Scope (for Jira-sourced: preserve original out-of-scope from Jira, then add derived ones)
- [ ] Completion Evidence (what to provide when done)

**For Jira-sourced stories**: Keep original Jira title, description, AC, and out-of-scope unchanged. Add all derived fields (steps, tests, patterns, prerequisites) around them.

### Phase 3: Documentation

**NEVER write all stories into one file — generates too many tokens and will exceed output limits.**

- [ ] Create `docs/plans/implementation-plan.md` as **lean index only** (epic titles + story titles + one-line objectives — NO full story content)
- [ ] Add **QA Manual Testing Groups** section at the end of `implementation-plan.md` (see Output below)
- [ ] Create each story as an individual file **one at a time**: `docs/plans/stories/epic-N-story-N.M-Story-Title.md`
  - **Always this naming** — no build number in filename (build tracked inside story content)
  - Write one story → confirm and ask to continue with next story → write next story (never batch all stories in one response)
  - Story files MUST follow `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md`
- [ ] Present index to user for approval before writing story files
- [ ] **After writing each story**, prompt:
  ```
  ✅ Story N.M written: docs/plans/stories/epic-N-story-N.M-<slug>.md
  Next? 1) Continue to next story  2) Edit this story  3) Stop
  ```
  - (1) Continue → write the next story.
  - (2) Edit → apply edits to the just-written story, then re-prompt the same 3 options.
  - (3) Stop → halt; do not write further stories.
- [ ] 🔴 **NEVER batch multiple stories in a single response** — exceeds token limits.
- [ ] **After all stories are written**, print:
  ```
  ✅ Stories written. Dependency graph at docs/plans/dependency-graph.yml.
     Wave 1 contains [list of story IDs]; these can be implemented in parallel
     via `aire-dev-implement` (choose mode 2 — "in one go").
  ```

### Phase 4: Jira Sync (MANDATORY — Always ask, even if MCP not configured)

After user approves plan, check `docs/status.md` for the **Project Tracking** block:

- If `**Tracking**: Jira` → follow the **Jira path** below.
- If `**Tracking**: GitHub Projects` → follow the **GitHub path** (at the end of Phase 4).
- Otherwise → ask:
  ```
  ❓ Push stories to: 1) Jira   2) GitHub   3) Skip
  ```

#### Jira Path

#### 4.1 — Classify Stories by Origin

Scan all story files and split into two groups:
- **Jira-sourced stories**: Stories where `**Jira**:` is a real Jira ID (e.g., `PROJ-101`) — already exist in Jira
- **Local stories**: Stories where `**Jira**: LOCAL` — new, don't exist in Jira yet

```
📊 Story Origin Summary:

  🔗 Jira-sourced: [N] stories (already in Jira)
     [List: Story N.M → PROJ-101, Story N.M → PROJ-102, ...]

  🆕 Local: [M] stories (new — will be pushed to Jira)
     [List: Story N.M — [Title], Story N.M — [Title], ...]

Syncing to Jira...
```

#### 4.2 — Get Project Key

```
❓ Jira project key? (e.g., PROJ)
```

#### 4.3 — Sync Jira-Sourced Stories (Label + fixVersion Only)

For stories that already exist in Jira — **do NOT create duplicates**, just tag them:

```
@atlassian-rovo For each existing Jira issue:
- Add labels: epic-N, story-N.M, cycle-[N]
- Set `fixVersion` to `cycle-[N]` (e.g., cycle-1, cycle-2)
- Add comment: "Planned as Story N.M in AIRE implementation plan (BUILDID: CYCLE-N)"

Issues to update:
- PROJ-101 → labels: epic-1, story-1.1, cycle-1 | fixVersion: cycle-1
- PROJ-102 → labels: epic-1, story-1.2, cycle-1 | fixVersion: cycle-1
...
```

#### 4.4 — Push Local Stories to Jira (Full Export)

For new stories that don't exist in Jira — create them:

1. Get assignees: `@atlassian-rovo list assignable users [PROJECT_KEY]`
2. Ask: `Assign to: 1) Auto-distribute 2) One person 3) Unassigned 4) Manual`
3. Execute:
```
@atlassian-rovo Create in [PROJECT_KEY]:
- Epics with descriptions (only if epic doesn't already exist)
- Stories with full details (objective, AC, steps, tests)
- Labels: epic-N, story-N.M, cycle-[N]
- Set `fixVersion` to `cycle-[N]` (e.g., cycle-1, cycle-2) on EVERY new story
- Assignees per config
- Story points (auto or blank)
```

**CRITICAL Jira Fix Version Rule**: When stories have a BUILDID (e.g., CYCLE-1), the corresponding Jira `fixVersion` MUST be `cycle-1` (lowercase, hyphenated). If the version does not exist in the Jira project, create it first.

4. Show summary: updated issues, new issues created, fixVersion applied, cycle labels applied

---

#### GitHub Path

> **Rule for the agent: execute every `gh` / `gh api` command yourself via the Bash tool. Do NOT ask the user. If 422 "already exists", skip and continue.**

**Step 1 — Read tracking context**

From `docs/status.md`: `ORG`, `REPO`, `PROJECT_NUMBER`, `PROJECT_ID`, `RELEASE_FIELD_ID`, `PRIORITY_FIELD_ID`, `STORY_POINTS_FIELD_ID`.
From active cycle plan: `RELEASE_OPTION_ID_CYCLE_N`.

**Step 2 — Classify stories by origin**

Scan each `docs/plans/stories/epic-N-story-N.M-*.md`:
- **Already-linked**: header has `**GitHub**: #<number>` → **update** path
- **New**: header has `**GitHub**: LOCAL` or no GitHub field → **create** path

Print counts:

```
🔗 Already-linked: N stories (will update labels/milestone/project)
🆕 New:            M stories (will create fresh GitHub issues)
```

**Step 3 — Ensure `epic:N` and `cycle:N` labels + Epic Milestones exist**

```bash
gh label create "epic:N" --color "6F42C1" --repo "ORG/REPO" --force --description "Epic N"
gh label create "cycle:N" --color "5319E7" --repo "ORG/REPO" --force

gh api repos/ORG/REPO/milestones --method POST \
  -f title="Epic N: <Epic Name>" \
  -f description="<objective>" \
  -f due_on="<YYYY-MM-DD>T23:59:59Z"
# If 422, fetch existing milestone number:
gh api "repos/ORG/REPO/milestones?state=all" --jq '.[] | select(.title=="Epic N: <Epic Name>") | .number'
```

**Step 4a — CREATE path (new local stories)**

> **⚠️ CRITICAL — two failure modes that have silently burned past runs:**
>
> 1. **`--milestone` takes the milestone TITLE STRING, not the integer number.** `gh issue create --milestone 1` fails with "could not resolve to a Milestone" and the issue is NOT created. Always pass the full title (e.g. `--milestone "Epic 1: Project Foundation"`). The integer number captured from Step 3 is only for the REST API, not for `gh issue create` / `gh issue edit`.
> 2. **Never swallow the output of `gh issue create` into a variable without verifying both the exit code and that the captured value is a URL matching `https://github.com/<owner>/<repo>/issues/<number>`.** Whatever shell the agent is running in, some wrappers route `gh`'s error text to the same capture stream as the URL, and a surrounding print/log statement can exit 0 even when the issue was never created. After every call, assert: (a) exit status is 0, and (b) captured output matches the issue-URL pattern. On mismatch, STOP the loop — do not keep creating stories on top of a silent failure.

For each new story, run:

```bash
gh issue create --repo "ORG/REPO" \
  --title "Story N.M: <Title>" \
  --body "<AC + Prerequisites + Steps summary + Tests + Out of Scope + BUILDID: CYCLE-N>" \
  --label "story" --label "epic:N" --label "cycle:<N>" --label "<size>" --label "P<priority>" \
  --milestone "Epic N: <Epic Name>"
```

**Verify before continuing to the next story.** Two checks, in whichever shell the agent is using:

1. The exit status of `gh issue create` is 0.
2. The captured output matches `^https://github\.com/[^/]+/[^/]+/issues/\d+$`.

If either fails, STOP the loop and report the captured output verbatim. Only after both pass, extract the trailing `\d+` → `ISSUE_NUMBER`.

Then attach to the Project and set fields (same as greenfield Step 5):

```bash
ISSUE_ID=$(gh api "repos/ORG/REPO/issues/ISSUE_NUMBER" --jq '.node_id')

ITEM_ID=$(gh api graphql -f query='
mutation($projectId:ID!,$contentId:ID!){
  addProjectV2ItemById(input:{projectId:$projectId,contentId:$contentId}){ item{ id } }
}' -f projectId="PROJECT_ID" -f contentId="$ISSUE_ID" --jq '.data.addProjectV2ItemById.item.id')

gh api graphql -f query='
mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){
  updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item{ id } }
}' -f projectId="PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="RELEASE_FIELD_ID" -f optionId="RELEASE_OPTION_ID_CYCLE_N"
```

Update the story file header: `**GitHub**: LOCAL` → `**GitHub**: #ISSUE_NUMBER`.

**Step 4b — UPDATE path (already-linked stories)**

For each story with an existing `**GitHub**: #N`:

```bash
# Add labels + cycle + assign milestone (no duplicate issue)
gh issue edit N --repo "ORG/REPO" \
  --add-label "cycle:<N>" --add-label "epic:N" \
  --milestone "Epic N: <Epic Name>"

# Add comment
gh issue comment N --repo "ORG/REPO" \
  --body "Planned as Story N.M in AIRE implementation plan (BUILDID: CYCLE-N)"
```

If the issue is not yet on the project, add it + set Release field (same GraphQL as Step 4a).

**Step 5 — Summary**

Print: updated issues, new issues created, project URL, Release Plan option tagged.

---

### Phase 5: Update docs/status.md (MANDATORY)

- [ ] **Follow `SPEC/templates/STATUS_FORMAT.md`** — all fields/sections below must match that format
- [ ] Update `docs/status.md`:
  - **Updated By** → `PRODUCT_OWNER`
  - **Progress Summary** → Set "Implementation Plan" row to `✅ Done`, evidence: `docs/plans/implementation-plan.md`
  - **Current Step Details** → List all epics and story counts
  - **Completed Steps** → Add implementation plan with story count
  - **Upcoming** → First story to implement: `aire-dev-implement [N.M]`
  - **Build Cycles** table → Set **Stories** column to `0/[total]` for each cycle (count stories per BUILDID)
  - **Story Tracker** → Create and update table with one row per story (BUILDID, Story number, Title, Start: `—`, End: `—`)
  - **Agent Activity** → Update PRODUCT_OWNER to Idle

---

## Output

**Index** (`docs/plans/implementation-plan.md`): epic titles + story titles + one-line objectives


**QA Manual Testing Groups** — append as the last section in `implementation-plan.md`. Groups are ordered by **first testable milestone**, by epic. Every story appears in exactly one group — backend/API stories are listed as prerequisites (marked `[backend]`) inside the group that makes them manually testable, so QA can see the full picture and knows no stories were dropped.

Format:
```
## QA Manual Testing Groups

### Epic N: [Name]

**Group 1** — Stories: N.1 `[backend]`, N.2 `[backend]`, N.3
[Paragraph: once all stories in this group are done, QA can test X end-to-end. Mention what the backend stories provide (API, DB layer) and what the UI stories unlock. Describe the full user flow, what to verify, and any edge cases.]

**Group 2** — Stories: N.4, N.5
[Paragraph describing the combined test scenario.]
```

Rules:
- **Every story must appear in exactly one group** — no story is silently omitted
- **Groups never cross epic boundaries** — all stories in a group belong to the same epic
- Within an epic that has UI stories, backend/API stories are listed with `[backend]` alongside the UI stories they enable
- Keep descriptions concise — one paragraph per group; explain what the backend stories enable and what QA can verify end-to-end

**Story files** (`docs/plans/stories/epic-N-story-N.M-Story-Title.md`):
- Naming always `epic-N-story-N.M-Story-Title.md` — no build prefix in filename
- BUILDID tracked inside story header
- Written **one at a time** — never all in one response

---

## Mandatory Rules

Every story MUST include:
- Tests WITH code (never postponed)
- Run tests after EVERY story
- Update status with evidence
- Self-review document
- Epic review at epic end

---

## Rules

- 🔴 Measurable success criteria
- 🔴 Explicit scope boundaries
- 🔴 Reference existing patterns from deep-dive
- 🔴 NEVER write all stories in one response — exceeds token limits (one story per response, always)
- 🔴 After each story, ask: 1) Continue 2) Edit this story 3) Stop
- 🔴 Vertical slices only — no horizontal/layer-based epics

---

**Type "proceed" to generate implementation plan.**

---

## Mandatory Next Steps to suggest user

**You are here → `aire-brownfield-plan`**

| # | Next Command | Purpose |
|---|-------------|---------|
| ▶️ | `aire-dev-implement` | Implement each story from the plan |


