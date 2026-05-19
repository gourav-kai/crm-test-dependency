---
copyright: "Copyright © 2026 3Pillar Global, Inc."
license: "Proprietary - 3Pillar Background IP"
date: "2026-04-24"
component: "3Pillar AIRE SDLC Agentic Framework"
description: Greenfield Phase 1.4 - Implementation Planning. Create detailed execution plan.
legal_notice: |
  PROPERTY OF 3PILLAR GLOBAL, INC. - CONFIDENTIAL & PROPRIETARY

  Component: 3Pillar AIRE SDLC Agentic Framework
  Copyright © 2026 3Pillar Global, Inc. All Rights Reserved.

  This file contains 3Pillar Pre-Existing Materials. When used in client deliveries, this component is licensed pursuant to the Master Services Agreement between 3Pillar Global and the client.

  USE RESTRICTIONS:
  Unauthorized use, reproduction, or distribution is strictly prohibited.
---

# Greenfield - Implementation Plan

## Agent

**PRODUCT_OWNER** 

## Before Starting

1. Read `SPEC/agents/AIRE_PRODUCT_OWNER.md`
2. Read `SPEC/rulebooks/aire-greenfield-rulebook.md`
3. **CRITICAL**: Read `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md` for mandatory format
4. Read `docs/requirements.md` — if missing, **STOP**: Tell user to "Run `aire-greenfield-requirements` first."
5. Read `docs/architecture/design/00-system-architecture-greenfield.md` — if missing, **STOP**: Tell user to "Run `aire-greenfield-architecture` first."
6. Read `docs/architecture/design/01-patterns-and-standards-greenfield.md` — if missing, **STOP**: Tell user to "Run `aire-greenfield-patterns` first."
7. **OPTIONAL UI/UX**: Ask user if UI/UX design needed (see § UI/UX Design Step below)
8. **IF UI/UX DONE**: Read `docs/ui-ux/ui-ux-spec.md` for design tokens
9. **SEQUENTIAL NUMBERING**: Check for existing epics/stories and ask user for starting numbers
10. **BUILD CYCLE CHECK** *(optional)*: Check if `docs/plans/builds/` exists. If it does, follow build-cycle integration below. If it does not, ask the user: "No build cycles found. Run `aire-build-cycles` first, or proceed without cycles? (cycles are optional)". If user proceeds without, skip BUILDID assignment entirely.
---

## 🔢 STEP 0: Epic/Story Numbering (ALWAYS DO THIS FIRST)

**CRITICAL**: Before creating the implementation plan, determine the starting epic/story numbers.

### Check Existing Implementation Plan

1. **Read the existing plan** (if it exists):
   - Check if `docs/plans/implementation-plan.md` exists
   - If it exists, read the entire file
   - Find all Epic headers: `## EPIC N:` or `# Epic N:`
   - Find all Story headers: `### Story N.M:` or `## Story N.M:`
   - Identify the **highest Epic number** and **highest Story number**

2. **Determine next numbers**:
   - If **no implementation plan exists**: Start from Epic 1, Story 1.1
   - If **plan exists with Epic X, Story X.Y as last**:
     - For adding stories to same epic: Epic X, Story X.(Y+1)
     - For new major feature/milestone: Epic (X+1), Story (X+1).1

3. **Ask User to Confirm**:
   ```
   📊 Current Implementation Plan Status:
   
   [If plan exists]
   ✓ Found existing implementation-plan.md
   ✓ Last Epic: Epic X
   ✓ Last Story: Story X.Y
   
   [If no plan exists]
   ℹ️  No existing implementation-plan.md found
   ℹ️  This appears to be a new project
   
   💡 Recommended Starting Point:
   
   For greenfield projects:
   - Initial setup: Epic 1, Story 1.1
   - Adding features after setup: Epic (X+1), Story (X+1).1
   
   Options:
   1. Use recommended numbering (Epic [N], Story [N.1])
   2. Continue in current epic (Epic [X], Story [X.Y+1]) - only if adding to same feature area
   3. Specify custom epic/story numbers
   
   Which option? (1-3):
   ```

4. **Confirm Final Numbers**:
   ```
   ✅ Confirmed: Starting implementation plan from:
   - First Epic: [N]
   - First Story: [N.1]
   
   Ready to proceed? (yes/no)
   ```

### CRITICAL Rules for Sequential Numbering

- ✅ **ALWAYS continue sequentially** - never reset to Epic 1, Story 1.1 unless truly the first plan
- ✅ **Read the file first** - don't guess, actually read `docs/plans/implementation-plan.md`
- ✅ **Ask user to confirm** - show what you found and what you'll use
- ❌ **NEVER overwrite** existing epics - always increment
- ❌ **NEVER create duplicate** epic/story numbers

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

Every story file MUST include the BUILDID in the header:

```
### Story N.M: [Title]

**BUILDID**: CYCLE-[N] | **Epic**: N - [NAME] | **ID**: N.M | **Date**: [YYYY-MM-DD] | **Jira**: LOCAL
```

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

## Builds-Based Planning (WHEN SPEC/references/builds/ has documents)

- **Each build = independent delivery**: group ALL epics for Build N before Build N+1
- **Label epics**: `## EPIC N: [BUILD 1] Feature Name` (use confirmed build names from requirements.md)
- **Each build must be**: fully dev-implementable → testable → deployable before next build begins
- **No cross-build dependencies within a story**: stories in Build 1 must not require Build 2 code
- **Build sequence**: confirmed during greenfield-requirements (see docs/requirements.md)

---

## Execution Steps:

### Phase 1: Plan Structure
- [ ] Review all documentation
- [ ] **Define epics using VERTICAL FEATURE SLICES (MANDATORY)**:
  - **Epic 1: Project Foundation** - Setup BOTH frontend AND backend scaffolding + verify connection (walking skeleton)
  - **Epic 2+: One Feature Per Epic** - Each epic = ONE complete feature across ALL layers
  - Within each epic, order stories: Backend API → Frontend UI → Integration/Wiring
- [ ] Break into stories (1-4 hours each)

**❌ Example of FORBIDDEN PATTERNS (Horizontal/Layer-Based)**:

```
Epic 1: Backend Setup
  Story 1.1: Express server
  Story 1.2: Database models
  Story 1.3: All API endpoints
  Story 1.4: Authentication middleware

Epic 2: Frontend Setup
  Story 2.1: React scaffolding
  Story 2.2: All components
  Story 2.3: All pages
  Story 2.4: Routing

Epic 3: Integration
  Story 3.1: Connect everything
```
**Problem**: Nothing testable until Epic 3 complete

**✅ Example of REQUIRED PATTERNS (Vertical/Feature-Based)**:

```
Epic 1: Project Foundation (Walking Skeleton)
  Story 1.1: Backend Skeleton (Express + health endpoint)
  Story 1.2: Frontend Skeleton (React + basic routing)
  Story 1.3: Connect FE to BE (health check displayed)
  Story 1.4: Database Setup (MongoDB + connection test)
  ✅ TESTABLE: Homepage shows "Backend: Connected, DB: Connected"

Epic 2: User Authentication (Complete Feature)
  Story 2.1: Auth API (Backend - register/login endpoints)
  Story 2.2: JWT Middleware (Backend - token validation)
  Story 2.3: Auth Service (Backend - password hashing, token generation)
  Story 2.4: Login/Register Forms (Frontend - UI components)
  Story 2.5: Auth Context (Frontend - state management)
  Story 2.6: Protected Routes (Frontend - route guards)
  Story 2.7: Integration Test (End-to-end auth flow)
  ✅ TESTABLE: User can register, login, access protected pages

Epic 3: Product Catalog (Complete Feature)
  Story 3.1: Product Model & API (Backend - CRUD endpoints)
  Story 3.2: Product Search API (Backend - filtering, pagination)
  Story 3.3: Product List Page (Frontend - display products)
  Story 3.4: Product Detail Page (Frontend - single product view)
  Story 3.5: Search & Filter UI (Frontend - user controls)
  Story 3.6: Integration Test (End-to-end product browsing)
  ✅ TESTABLE: User can browse, search, view product details

Epic 4: Shopping Cart (Complete Feature)
  Story 4.1: Cart Model & API (Backend - add/remove/update)
  Story 4.2: Cart Persistence (Backend - save to DB)
  Story 4.3: Cart Component (Frontend - cart display)
  Story 4.4: Add to Cart Button (Frontend - product integration)
  Story 4.5: Cart Page (Frontend - full cart view)
  Story 4.6: Integration Test (End-to-end cart operations)
  ✅ TESTABLE: User can add/remove items, view cart
```

**Why Vertical Slices**:
- ✅ Each epic is testable and demo-able
- ✅ Early user feedback per feature
- ✅ Reduces integration risk
- ✅ Parallel team work possible
- ✅ Clear progress visibility
- ❌ Horizontal = nothing works until all layers done

### Phase 1.5: Story-Dependency Graph (MANDATORY when plan has 2+ stories)

Before writing any story files, produce `docs/plans/dependency-graph.yml` co-authored by AIRE_ARCHITECT and AIRE_PRODUCT_OWNER. The graph drives parallel execution in `aire-dev-implement` and downstream workflows.

**Two-option entry — story-file authoring stays one-at-a-time.** This phase does NOT add parallel story-file writing. It only produces the graph used later by execution workflows.

Steps:

1. **Ask `team_size` once:**
   ```
   ❓ How many developers will be working on this project?
      (Used to size waves and as a planning hint for how finely to split stories.
       Not a runtime concurrency cap.)
   ```

2. **For each story, populate the graph entry:**
   - `requires`: from architecture-natural ordering (skeleton before features, contracts before consumers, data model before query).
   - `enables`: reverse edges (informational).
   - `files_touched`: from AIRE_ARCHITECT's File/Module Boundary Map in the patterns doc.
   - `assignee`: null in greenfield (no Jira source). May be assigned by user if they request it; otherwise omit.

3. **Identify `shared_files`** — files that serialize across stories (e.g. `package.json`, central route registry, migrations index). Default empty.

4. **Validate disjoint-files across each wave**: any two stories in the same wave must have disjoint `files_touched` modulo `shared_files`. If overlap, return to Architect to split.

5. **Compute waves** by topological layering: wave 1 = stories with `requires: []`; wave N+1 = stories whose requires are satisfied by waves ≤ N.

6. **Write `docs/plans/dependency-graph.yml`** following the schema in `SPEC/templates/IMPLEMENTATION_PLAN_FORMAT.md`.

7. **Add `## Dependency Graph` section at the top of `docs/plans/implementation-plan.md`** with:
   - A Mermaid `graph TD` mirror of the YAML.
   - A wave summary table.
   - A note: "If the Mermaid drifts from the YAML, the YAML wins. Run `aire graph-check`."

8. **Show the graph to the user and confirm:**
   ```
   📊 Dependency Graph
      - Total stories: K
      - Waves: W (largest wave = M stories)
      - Independent at root: R
      - Longest dependency chain: L stories deep

      Proceed to story file authoring? (yes / revise graph)
   ```
   Block until the user confirms `yes`.

### Phase 2: Detail Each Story
For each story include (see IMPLEMENTATION_PLAN_FORMAT.md for complete requirements):
- [ ] **Must Read Reference Files** (at the very top - images, specs, designs from `SPEC/references/`)
- [ ] **Design Tokens and Icons to Use** (for frontend stories - from `docs/ui-ux/ui-ux-spec.md` if exists)
- [ ] Epic context (Epic number, Story ID, Date)
- [ ] **Requires / Enables / Files Touched / Assignee** — MUST mirror `docs/plans/dependency-graph.yml`
- [ ] **Story Description** (detailed explanation of what the story does, what it achieves, and why it matters — placed at the top of the story)
- [ ] Acceptance Criteria (comprehensive — cover every functional, edge-case, and validation scenario; include as many as needed to fully define "done")
- [ ] Prerequisites
- [ ] Context files to read (specific paths, including `docs/ui-ux/ui-ux-spec.md` for frontend)
- [ ] Patterns to follow (with doc links)
- [ ] **Implementation Steps** (detailed, numbered, WITH code examples using design tokens)
- [ ] **Test Requirements** (unit tests WITH code examples + manual tests)
- [ ] Quality Checks (ESLint, coverage, etc.)
- [ ] Explicitly OUT of Scope
- [ ] Completion Evidence (what to provide when done)
- [ ] **CRITICAL CONSTRAINT**: DO NOT include Duration, Timeline, or Estimate fields in stories.

### Phase 3: Documentation

**⚠️ NEVER write all stories into one file — generates too many tokens and will exceed output limits.**

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
  - (2) Edit → apply  edits to the just-written story, then re-prompt the same 3 options.
  - (3) Stop → halt; do not write further stories.
- [ ] 🔴 **NEVER batch multiple stories in a single response** — exceeds token limits.
- [ ] **After all stories are written**, print:
  ```
  ✅ Stories written. Dependency graph at docs/plans/dependency-graph.yml.
     Wave 1 contains [list of story IDs]; these can be implemented in parallel
     via `aire-dev-implement` (choose mode 2 — "in one go").
  ```

### Phase 4: Jira Export (MANDATORY — Always ask, even if MCP not configured)
After user approves plan, ask:

After user approves plan, check `docs/status.md` for the **Project Tracking** block:

- If `**Tracking**: Jira` → follow the **Jira path** below.
- If `**Tracking**: GitHub Projects` → follow the **GitHub path** below.
- Otherwise → ask:
  ```
  ❓ Export stories to: 1) Jira   2) GitHub   3) Skip
  ```

#### Jira Path

**If YES**:
1. Ask user and Get project key: `❓ Jira project key? (e.g., PROJ)`
2. Get assignees: `@atlassian-rovo list assignable users [PROJECT_KEY]`
3. Ask: `Assign to: 1) Auto-distribute 2) One person 3) Unassigned 4) Manual`
4. Show preview with epic/story counts
5. Confirm: `Create in Jira? (yes/no)`
6. Execute:
```
@atlassian-rovo Create in [PROJECT_KEY]:
- Epics with descriptions
- Stories with full details (objective, AC, steps, tests)
- Labels: epic-N, story-N.M
- **If BUILDID is set**: Set `fixVersion` to `cycle-[N]` (e.g., cycle-1, cycle-2) on EVERY story and epic in this cycle
- Assignees per config
- Story points (auto or blank)
```

**CRITICAL Jira Fix Version Rule**: When stories have a BUILDID (e.g., CYCLE-1), the corresponding Jira `fixVersion` MUST be `cycle-1` (lowercase, hyphenated). If the version does not exist in the Jira project, create it first. This allows filtering and tracking all stories belonging to a specific build cycle via Jira Releases.

7. Show summary: Epic/story keys, URLs, fixVersion applied, next steps

8. **MANDATORY — Update local story files with Jira IDs**:
   After Jira issues are created, go back and update the `**Jira**:` field in each local story file (`docs/plans/stories/epic-N-story-N.M-*.md`) with the actual Jira issue key returned from creation:
   - Before: `**Jira**: LOCAL`
   - After: `**Jira**: PROJ-201`
   
   This ensures full traceability between local story files and Jira issues.

---

#### GitHub Path

> **Rule for the agent: run every `gh` / `gh api` command yourself via the Bash tool. Do NOT ask the user to run them. If a command returns 422 "already exists", skip and continue.**

**Step 1 — Read tracking context**

From `docs/status.md`: `ORG`, `REPO`, `PROJECT_NUMBER`, `PROJECT_ID`, `RELEASE_FIELD_ID`, `PRIORITY_FIELD_ID`, `STORY_POINTS_FIELD_ID`.

From the active cycle plan (`docs/plans/builds/cycle-[N]/cycle-plan.md`): `RELEASE_OPTION_ID_CYCLE_N`.

**Step 2 — Ensure `epic:N` and `cycle:N` labels exist**

```bash
# For each epic N in this planning session:
gh label create "epic:N" --color "6F42C1" --repo "ORG/REPO" --force --description "Epic N — <Epic Name>"

# Ensure cycle label for active BUILDID:
gh label create "cycle:N" --color "5319E7" --repo "ORG/REPO" --force --description "Cycle N"
```

**Step 3 — Create one Milestone per Epic**

```bash
gh api repos/ORG/REPO/milestones --method POST \
  -f title="Epic N: <Epic Name>" \
  -f description="<epic objective from implementation-plan.md>" \
  -f due_on="<YYYY-MM-DD>T23:59:59Z"
```

Capture each milestone's `number` from the response — this is `MILESTONE_NUMBER_EPIC_N`. If the milestone already exists (422), fetch its number with:

```bash
gh api "repos/ORG/REPO/milestones?state=all" --jq '.[] | select(.title=="Epic N: <Epic Name>") | .number'
```

**Step 4 — Create one Issue per Story** (loop per story; run all commands in the CLI yourself)

> **⚠️ CRITICAL — two failure modes that have silently burned past runs:**
>
> 1. **`--milestone` takes the milestone TITLE STRING, not the integer number.** `gh issue create --milestone 1` fails with "could not resolve to a Milestone" and the issue is NOT created. Always pass the full title, e.g. `--milestone "Epic 1: Project Foundation"`. The integer number captured from Step 3 is only for the REST API, not for `gh issue create` / `gh issue edit`.
> 2. **Never swallow the output of `gh issue create` into a variable without verifying both the exit code and that the captured value is a URL matching `https://github.com/<owner>/<repo>/issues/<number>`.** Whatever shell the agent is running in, some wrappers route `gh`'s error text to the same capture stream as the URL, and a surrounding print/log statement can exit 0 even when the issue was never created. After every call, assert: (a) the command exit status is 0, and (b) the captured output matches the issue-URL pattern. On mismatch, STOP the loop and report — do not keep creating stories on top of a silent failure.

For each story N.M, build the body from the story file (Description, AC, Prerequisites, Implementation Steps summary, Test Requirements summary, Out of Scope), then:

```bash
gh issue create --repo "ORG/REPO" \
  --title "Story N.M: <Story Title>" \
  --body "$(cat <<'EOF'
## User Story
<story description>

## Acceptance Criteria
<checkboxes from story file>

## Prerequisites
<list>

## Implementation Steps (summary)
See: docs/plans/stories/epic-N-story-N.M-<slug>.md

## Test Requirements
<summary>

## Out of Scope
<list>

---
**BUILDID**: CYCLE-<N>
EOF
)" \
  --label "story" --label "epic:N" --label "cycle:<N>" --label "<size>" --label "P<priority>" \
  --milestone "Epic N: <Epic Name>" \
  --assignee "<github-username-or-omit>"
```

**Verify before continuing to the next story.** Two checks, in whichever shell the agent is using:

1. The exit status of `gh issue create` is 0.
2. The captured output matches the regex `^https://github\.com/[^/]+/[^/]+/issues/\d+$`.

If either check fails, STOP — do not proceed to the next story. Report the captured output verbatim so the failure is visible. Only after both checks pass, extract the trailing `\d+` from the URL → `ISSUE_NUMBER`.

**Step 5 — Add issue to the Project and set custom fields** (GraphQL)

```bash
# a) Resolve the issue's node id
ISSUE_ID=$(gh api "repos/ORG/REPO/issues/ISSUE_NUMBER" --jq '.node_id')

# b) Add the issue to the project → returns the ITEM_ID
ITEM_ID=$(gh api graphql -f query='
mutation($projectId:ID!,$contentId:ID!){
  addProjectV2ItemById(input:{projectId:$projectId,contentId:$contentId}){ item{ id } }
}' -f projectId="PROJECT_ID" -f contentId="$ISSUE_ID" --jq '.data.addProjectV2ItemById.item.id')

# c) Set Release field to this cycle's option
gh api graphql -f query='
mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){
  updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item{ id } }
}' -f projectId="PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="RELEASE_FIELD_ID" -f optionId="RELEASE_OPTION_ID_CYCLE_N"

# d) Set Story Points (number field)
gh api graphql -f query='
mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$num:Float!){
  updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{number:$num}}){ projectV2Item{ id } }
}' -f projectId="PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="STORY_POINTS_FIELD_ID" -F num=<points>
```

**Step 6 — Write issue number back into the local story file**

Update the story header in `docs/plans/stories/epic-N-story-N.M-<slug>.md`:

```
**BUILDID**: CYCLE-N | **GitHub**: #ISSUE_NUMBER | **Epic**: N - <NAME> | **ID**: N.M | **Date**: YYYY-MM-DD
```

**Step 7 — Summary**

Print to user: total epics (milestones) created, total stories (issues) created, project URL, and the Release Plan option name these are tagged under.

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

**Index** (`docs/plans/implementation-plan.md`): epic titles + story titles + one-line objectives; if builds present, group epics under `### Build N` sections

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
- Build tracked inside story via `**Build**: N` header + build doc in Must Read
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

**Type "proceed" to generate implementation plan.**

---

## 🔄 Next Steps in AIRE Workflow

**You are here → `aire-greenfield-plan`**

| # | Next Command | Purpose |
|---|-------------|---------|
| ▶️ | `aire-dev-implement` | Build each story from the implementation plan |

