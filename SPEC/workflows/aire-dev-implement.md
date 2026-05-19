---
copyright: "Copyright © 2026 3Pillar Global, Inc."
license: "Proprietary - 3Pillar Background IP"
date: "2026-04-24"
component: "3Pillar AIRE SDLC Agentic Framework"
description: Dev - Implement Story. Execute implementation plan stories.
legal_notice: |
  PROPERTY OF 3PILLAR GLOBAL, INC. - CONFIDENTIAL & PROPRIETARY

  Component: 3Pillar AIRE SDLC Agentic Framework
  Copyright © 2026 3Pillar Global, Inc. All Rights Reserved.

  This file contains 3Pillar Pre-Existing Materials. When used in client deliveries, this component is licensed pursuant to the Master Services Agreement between 3Pillar Global and the client.

  USE RESTRICTIONS:
  Unauthorized use, reproduction, or distribution is strictly prohibited.
---
# Dev - Implement Story

## Agent

**DEV** 

## Before Starting

1. Read `SPEC/agents/AIRE_DEV.md`
2. Read `SPEC/rulebooks/aire-implementation-rulebook.md`
3. Read `docs/plans/implementation-plan.md` — if missing, **STOP**: Tell user to "Run `aire-greenfield-plan` or `aire-brownfield-plan` first."
4. Read individual story file `docs/plans/stories/epic-N-story-M-*.md`
5. Read pattern docs from `docs/architecture/`

**Note**: Individual story files (if plan has been split) contain complete epic context and all details needed.

--- 

## Execution Mode (ask FIRST, before anything else)

When the user invokes `aire-dev-implement` and `docs/plans/dependency-graph.yml` exists, ask:

```
🚦 Execution mode?
  1) One-by-one — implement one story at a time (today's default)
  2) In one go (parallel) — implement an entire ready wave in parallel by
     spawning one subagent per story. Subagents run concurrently; each writes
     to its own status shard, then the parent rolls up.

Type 1 or 2:
```

Exactly two options. If `docs/plans/dependency-graph.yml` is missing OR the plan has only one story, default to mode 1 silently.

### Mode 1 — One-by-one (existing behavior, unchanged)

Proceed to **Tell Me Which Story** below. Everything works exactly as it does today.

### Mode 2 — In one go (parallel)

This is the new behavior. The parent agent orchestrates; subagents implement.

**Pre-flight (parent does this before spawning anything):**

1. Read `docs/plans/dependency-graph.yml` and `docs/status.md`.
2. Identify the **next ready wave** = stories whose `requires` are all marked `Done` in `## Story Tracker` AND who are not themselves already `Done`.
3. **Disjoint-files check**: verify no two stories in the ready set touch overlapping files outside `shared_files`. On overlap, ABORT and tell the user the graph is corrupt — run `aire graph-check`.
4. **Show the user the wave and confirm:**
   ```
   📊 Wave ready: [list of story IDs]
      - 1.1 (alice@org.com) → src/server/index.ts, src/server/health.ts
      - 1.2 (bob@org.com)   → src/web/main.tsx, src/web/App.tsx
   Spawn N subagents now? (y/n)
   ```
5. (Jira-sourced multi-dev case) Optionally offer the assignee filter:
   ```
   Filter by your assignee? (you=<email>) yes/no
   ```
   When `yes`, the parent narrows the spawn set to stories assigned to the current user.

**Dispatch (parent spawns one subagent per ready story):**

Use the `Agent` tool. Each subagent receives:

- The story file path (`docs/plans/stories/epic-N-story-N.M-*.md`).
- The slice of `docs/plans/dependency-graph.yml` for that story (its `files_touched`, `shared_files`, `requires`).
- The patterns doc path.
- **Explicit prohibitions**:
  - Do NOT edit any file outside this story's `files_touched`.
  - Do NOT edit any file in `shared_files`.
  - Do NOT write to Jira / GitHub.
  - Do NOT edit `docs/status.md` directly — append a single start-line and a single done-line to `docs/status/events.log` only.

**Streaming dispatch (wave boundaries are advisory):**

As each subagent reports `done`, the parent immediately:

1. Re-reads `docs/status/events.log`.
2. Runs `git diff --name-only` and verifies the subagent stayed within its `files_touched`. On violation: revert that story's changes and flag the user.
3. Updates `## Story Tracker` (End date), `## Current Step (Log)`, `## Quality Metrics (Log)`, and regenerates rollups.
4. Re-scans the graph for any newly-ready story (its `requires` are now Done) and dispatches it. The parent does NOT wait for the whole wave to finish before dispatching the next-ready story.

**Post-batch (after all in-flight stories complete):**

- Run the existing per-story Jira / GitHub status update flow.
- Ask the user once: *"Update Jira/GitHub for each story individually, or push the batch in one go?"*
- Apply the user's choice.

---

## Tell Me Which Story

**IMPORTANT**: Always ask user to choose between local, Jira, and GitHub stories.

> Only applicable in Mode 1 (one-by-one). In Mode 2 (parallel), the parent has already selected the ready wave.

**Detect active tracker first** — read `docs/status.md`. Look at the `## Project Tracking` block:
- `**Tracking**: Jira` → enable Jira options
- `**Tracking**: GitHub Projects` → enable GitHub options (capture `ORG`, `REPO`, `PROJECT_NUMBER`, `PROJECT_ID`, `STATUS_FIELD_ID`, and note the `STATUS_OPTION_ID_*` values by running `gh project field-list PROJECT_NUMBER --owner ORG --format json` once per session)
- neither → only local options apply

Present these options (show only the relevant tracker block):

```
Which story would you like to implement?

📁 LOCAL Stories (from implementation-plan.md):
  1. "story 1.1" - Implement from local plan
  2. "next story" - Next story in local plan
  3. "story [component name]" - Specific component

🔗 JIRA Stories (if MCP configured):
  4. "pick from jira" - Fetch next available Jira story
  5. "jira story PROJ-123" - Specific Jira story

🐙 GITHUB Stories (if GitHub Projects tracking active):
  6. "pick from github" - Fetch next "Sprint Ready" or "Backlog" story issue
  7. "github issue #N" - Specific GitHub issue

⏭️  "skip" - I'll tell you later

Type your choice:
```

---

## 🔗 Jira Integration (Optional)

**ALWAYS ASK FOR CONFIRMATION** before any Jira operation.

### If User Chooses Local Story 

1. Read story from `docs/plans/implementation-plan.md` and `docs/plans/stories/epic-N-story-M-*.md`
2. Implement using local plan details
3. Only proceed with Jira if user confirms

### If User Chooses Jira Story

1. **First, fetch and show story details**:
   ```
   @atlassian-rovo Find next available story in project [ASK_FOR_PROJECT_KEY from user]:
   - Status: "To Do"
   - Not assigned to others
   - Highest priority
   ```

2. **Show story to user and ASK FOR CONFIRMATION**:
   ```
   Found: PROJ-123 "User Authentication"
   Status: To Do
   Priority: High
   Story Points: 5
   
   Description:
   [show description]
   
   Acceptance Criteria:
   [show criteria]
   
   ❓ Do you want to implement this story? (yes/no/show-next)
   ```

3. **If user says YES, ask about Jira updates**:
   ```
   ❓ Should I update Jira status to "In Progress"? (yes/no)
   ```

4. **Only after user confirms**, update Jira:
   ```
   @atlassian-rovo Update story PROJ-123:
   - Status: In Progress
   - Assign to: [current user]
   - Comment: "Development started via AIRE SDLC Agentic Framework Method"
   ```

**NEVER update Jira without explicit user confirmation**

---

## 🐙 GitHub Projects Integration (Optional)

> **Rule for the agent: run every `gh` / `gh api` command yourself via the Bash tool. Do NOT ask the user to run them. If a command returns 422 "already exists", skip and continue. Skip this section entirely if `docs/status.md` does NOT contain `**Tracking**: GitHub Projects`.**

**ALWAYS ASK FOR CONFIRMATION** before any board status update.

### If User Chooses "pick from github"

1. **Fetch candidate issues** — open `story`-labeled issues in the current cycle that are in "Sprint Ready" or "Backlog":

   ```bash
   # List open story issues in the active cycle (CYCLE-N from docs/status.md Story Tracker)
   gh issue list --repo "ORG/REPO" --state open --label "story" --label "cycle:N" --json number,title,labels,url,assignees
   ```

   Then query the Project to filter by Status:

   ```bash
   gh project item-list PROJECT_NUMBER --owner "ORG" --format json --limit 200
   ```

   Cross-reference on issue number. Prefer items whose Status is **Sprint Ready**, fall back to **Backlog**. Skip items already assigned to someone else.

2. **Show the story to user and ASK FOR CONFIRMATION**:
   ```
   Found GitHub issue #42 "Product Search API"
   Status: Sprint Ready
   Labels: story, epic:3, cycle:2, M, P1-high
   Milestone: Epic 3: Product Catalog
   URL: https://github.com/ORG/REPO/issues/42

   [Body excerpt — User Story + Acceptance Criteria]

   ❓ Do you want to implement this story? (yes/no/show-next)
   ```

3. **If YES, ask about board updates**:
   ```
   ❓ Should I move this issue to "In Development" on the board and assign it to you? (yes/no)
   ```

4. **Only after user confirms**, update the board:

   ```bash
   # a) Assign the issue to the current user
   gh issue edit ISSUE_NUMBER --repo "ORG/REPO" --add-assignee "@me"

   # b) Resolve the project item id for this issue
   ISSUE_ID=$(gh api "repos/ORG/REPO/issues/ISSUE_NUMBER" --jq '.node_id')
   ITEM_ID=$(gh project item-list PROJECT_NUMBER --owner "ORG" --format json --limit 500 \
     | python -c "import sys,json; d=json.load(sys.stdin); print(next(i['id'] for i in d['items'] if i.get('content',{}).get('number')==ISSUE_NUMBER))")

   # c) Move Status → In Development
   gh api graphql -f query='
   mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){
     updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item{ id } }
   }' -f projectId="PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="STATUS_FIELD_ID" -f optionId="STATUS_OPTION_ID_IN_DEVELOPMENT"

   # d) Post a start comment on the issue
   gh issue comment ISSUE_NUMBER --repo "ORG/REPO" --body "Development started via AIRE SDLC Agentic Framework. Moving to In Development."
   ```

5. **Map the GitHub issue to a local story file**:
   - Find `docs/plans/stories/epic-N-story-N.M-*.md` where the header `**GitHub**: #ISSUE_NUMBER` matches.
   - If no matching local story file exists, create one from the issue body so the DEV workflow has a reference file to operate on.

**NEVER change board status without explicit user confirmation.**

### If User Chooses "github issue #N"

Skip the fetch step. Run `gh issue view N --repo ORG/REPO --json number,title,body,labels,milestone,assignees,url`, show to user, then follow steps 2–5 above.

---

## Execution Steps:

### Phase 1: Preparation & Context
- [ ] Read story requirements (from local plan, Jira, or GitHub), noting action items, acceptance criteria, and what is IN/OUT of scope.
- [ ] **FIRST: Read all reference files** listed in the "Must Read" section (images, specs, designs from `SPEC/references/`).
- [ ] Review context: Read required context files, related existing code, and architecture docs to understand error handling and testing patterns.
- [ ] **Build snapshot** (if story has `**BUILDID**: N`): read `docs/plans/implementation-plan.md` → count total stories under `### Build N`. Count existing files in `docs/stories-implemented/` matching that build. Note: `Build N — X of Y stories done`. Use this at end.
- [ ] **MANDATORY**: Summarize what will be implemented, state assumptions, ask clarifying questions, and **GET USER APPROVAL** to proceed. **HALT until explicitly confirmed.**
- [ ] ✅ Jira: Story marked "In Progress" (if applicable and confirmed).
- [ ] ✅ GitHub: Issue assigned, board Status → "In Development" (if applicable and confirmed).
- [ ] Update **## Story Tracker** in `docs/status.md` — set **Start** date to today (`[YYYY-MM-DD]`).

### Phase 2: Implementation (Strict Execution Order)
- [ ] **Write Unit Tests First (TDD)**: Create test file covering happy paths, edge cases, and error scenarios. Run tests — they should fail initially.
- [ ] **Implement Code**: Implement in correct location. Apply SOLID principles, documented naming conventions, error handling, and logging patterns. Keep functions small and focused.
- [ ] **Verify Unit Tests**: Run unit tests. All tests must pass. 
- [ ] **Write Integration/E2E Tests**: Test integration points with real dependencies (or test doubles) and error scenarios.
- [ ] **Run Full Test Suite**: All tests must pass (100%). Capture test output as evidence. 
- [ ] **Quality Checks**: Verify test coverage is ≥85%. Verify zero lint warnings/errors.

### Phase 3: Status & Documentation
- [ ] Update `docs/status.md` per `SPEC/templates/STATUS_FORMAT.md` (Update Epic row progress, recalculate Overall Completion, add story to Completed Steps with test evidence).
- [ ] Create `docs/stories-implemented/story-[N.M]-review.md`.
- [ ] Document what was implemented, patterns applied, challenges and solutions, and lessons learned.
---

## Output

**Locations**:
- Implemented code with tests
- `docs/stories-implemented/story-[N.M]-review.md`

### Story Self-Review Template

```markdown
# Story [N.M] Self-Review

**Date**: [YYYY-MM-DD]  
**Story**: [Story Name]  
**Developer**: DEV Agent

---

## What Was Implemented

- [Feature/component 1]
- [Feature/component 2]

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `path/to/file.js` | New | [What it does] |
| `path/to/test.js` | New | [What it tests] |
| `path/to/existing.js` | Modified | [What changed] |

## Patterns Applied

| Pattern | Where Applied | Notes |
|---------|---------------|-------|
| Error handling | `userService.js` | Used standard pattern from arch docs |
| Logging | All new functions | Structured logging with context |
| Test patterns | `userService.test.js` | AAA pattern, descriptive names |

## Testing Summary

- **Unit Tests**: [X] written, all passing
- **Integration Tests**: [Y] written, all passing  
- **Coverage**: [Z]% (target: 85%)

**Test Output**:
```
[Paste test output here]
```

## DoD Evidence


## Challenges Encountered

| Challenge | Resolution | Time Spent |
|-----------|------------|------------|
| [Challenge 1] | [How resolved] | [X hours] |

## Deviations from Plan

- None / [Description with justification]

## Lessons Learned

1. [Lesson 1]
2. [Lesson 2]

## Next Steps

- [ ] Ready for code review
- [ ] Ready for Unit test validation
```


---

## Rules

- 🔴 Tests WITH code - never postpone (TDD)
- 🔴 Run ALL tests after every change
- 🔴 Execute items IN ORDER
- 🔴 Update status with EVIDENCE (test logs + coverage)
- 🔴 No TODO comments in production
- 🔴 Never skip action items
- 🔴 Zero lint errors allowed
- 🔴 ONE story per invocation — present completion, STOP, wait for user choice. Never batch multiple stories. "implement next" means the next ONE story only
- 🔴 NEVER skip stories on agent judgment (e.g., "no code needed") — present the assessment and let the user decide which story to implement
- 🔴 MUST confirm before coding — after reading the story, summarise scope and ask "proceed?" HALT until the user explicitly confirms. Do NOT write any code, create any files, or run any commands before this confirmation
---

## Story Completion

When a story is complete, do the following steps in order:

### 1. Update `docs/status.md`

Per `SPEC/templates/STATUS_FORMAT.md`:
- Update the Epic row progress: `[Y]/[Z] stories done`
- Recalculate **Overall Completion** percentage
- Add the story to **Completed Steps** with test evidence (pass count + coverage %)
- Update **Current Step Details** checklist — mark this story ✅
- Update **Upcoming** — show next story to implement
- Update **Agent Activity** — DEV active with last story completed
- Update **## Story Tracker** — set **End** date to today (`[YYYY-MM-DD]`) for this story
- Update **## Quality Metrics**:
  - **Unit Test Coverage**: set Current to latest coverage %, Status to ✅ if ≥85% or 🟡 if below
  - **Integration Tests**: set Current to pass count (e.g., `100% (15/15)`), Status to ✅ if all pass or 🟡 if failures
  - **Documentation**: increment `[done]/[total]` count (story-review doc created)
- Update **## Build Cycles** table:
  - Set cycle status to `🟡 In Progress` if not already
  - Update **Stories** column: `[done]/[total]` (e.g., `3/6` → `4/6`)

### 2. Update GitHub Issue Status (if GitHub tracking active)

> **Skip if the story header has no `**GitHub**: #N` field.**

If the story file has a `**GitHub**: #N` reference (set by `aire-greenfield-plan` / `aire-brownfield-plan`):

```
✅ Story implementation complete!

Tests: [X/X passing]
Coverage: [XX%]

❓ This story is GitHub issue #N.
   Would you like me to:
   1) Move the board Status to "In Review" (PR opened, awaiting review)
   2) Move the board Status to "In QA" (merged, ready for QA)
   3) Move the board Status to "Done" (accepted)
   4) Skip — I'll update the board myself
```

**Only after user confirms**:

```bash
# Resolve item id if not already captured
ISSUE_ID=$(gh api "repos/ORG/REPO/issues/N" --jq '.node_id')
ITEM_ID=$(gh project item-list PROJECT_NUMBER --owner "ORG" --format json --limit 500 \
  | python -c "import sys,json; d=json.load(sys.stdin); print(next(i['id'] for i in d['items'] if i.get('content',{}).get('number')==N))")

# Set Status to the chosen option (In Review / In QA / Done)
gh api graphql -f query='
mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){
  updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId,fieldId:$fieldId,value:{singleSelectOptionId:$optionId}}){ projectV2Item{ id } }
}' -f projectId="PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="STATUS_FIELD_ID" -f optionId="STATUS_OPTION_ID_<chosen>"

# Add completion comment with evidence
gh issue comment N --repo "ORG/REPO" --body "$(cat <<'EOF'
Implementation complete.
- Tests: X/X passing
- Coverage: XX%
- Linter: clean
- PR: <URL if created>
EOF
)"
```

If the user chose **Done**, also close the issue:

```bash
gh issue close N --repo "ORG/REPO" --reason completed
```

**NOTE**: If built-in project workflows (Manual Step 3 of `aire-project-kickoff`) are enabled (PR merged → Done, Review approved → In QA), the board may transition automatically when the PR is merged. In that case, skip the Status update here and only post the completion comment.

**NEVER update the board without explicit user confirmation.**

---

### 3. Update Jira Story Status

If story has a Jira ID (`**Jira**: PROJ-123`, not `LOCAL`):

```
✅ Story implementation complete!

Tests: [X/X passing]
Coverage: [XX%]

❓ This story exists in Jira as [JIRA-ID].
   Would you like me to mark it "Done" in Jira? (yes/no)
```

**If YES**:
```
@atlassian-rovo Update story [JIRA-ID] in project [PROJECT_KEY]:
- Change status to "Done"
- Add completion comment:
  * Tests: [X/X passing]
  * Coverage: [XX%]
  * Implementation details: [summary]
  * Link to PR (if created): [URL]
```

**If NO**: Story marked complete locally only.

### 4. Build Cycle Check

If story has `**BUILDID**: CYCLE-[N]`: use the snapshot from Phase 1 — if this was the **last remaining story** in this cycle (X+1 = Y):

**a) Update `docs/status.md` → `## Build Cycles` table:**
- Set the **End Date** for CYCLE-[N] to today's date (`[YYYY-MM-DD]`)
- Set status to `✅ Complete`

**b) Announce completion:**
```
🎉 Cycle [N] Complete! All [Y] stories implemented and tested.
```

**c) Update Jira fixVersion release date (Jira tracker only):**
```
❓ All stories for CYCLE-[N] are done.
   Should I set the release date on fixVersion "cycle-[N]" in Jira? (yes/no)
```

**If YES**:
```
@atlassian-rovo Update version "cycle-[N]" in project [PROJECT_KEY]:
- Set releaseDate to today's date ([YYYY-MM-DD])
- Set released to true
- Add description: "Cycle [N] — [scope summary]. All [Y] stories complete."
```
Report: `✅ Jira fixVersion "cycle-[N]" marked as released ([YYYY-MM-DD])`

**c') Publish GitHub draft Release (GitHub tracker only):**

If `docs/plans/builds/cycle-[N]/cycle-plan.md` has a `## GitHub Release Plan` block referencing a draft release tag `v<cycle-tag>`:

```
❓ All stories for CYCLE-[N] are done.
   Should I publish the draft GitHub Release "v<cycle-tag>"? (yes/no)
```

**If YES**:

```bash
# Flip the draft release to published
gh release edit "v<cycle-tag>" --repo "ORG/REPO" --draft=false --latest

# Post a summary comment on every issue in this cycle (optional)
for n in $(gh issue list --repo "ORG/REPO" --state all --label "cycle:N" --json number --jq '.[].number'); do
  gh issue comment "$n" --repo "ORG/REPO" --body "CYCLE-N released: https://github.com/ORG/REPO/releases/tag/v<cycle-tag>"
done
```

Report: `✅ GitHub Release v<cycle-tag> published ([YYYY-MM-DD])`

**d) Prompt next cycle:**
```
❓ Start Cycle [N+1]? (yes / no)
```
- yes → present first story of Cycle N+1
- no → summarize what Cycle N delivered

### 5. Present Next Options

```
✅ Story [N.M] Complete!

📊 Evidence:
- Tests: [X/X passing]
- Coverage: [XX%]
- Linter: [Clean/Issues]

🔗 Jira: Story marked "Done" [if applicable]
🐙 GitHub: Issue #N moved to [In Review / In QA / Done] [if applicable]

What would you like to do next?

⭐ RECOMMENDED but optional:
1️⃣  **aire-review-code** - Request code review for this story
2️⃣  **aire-qa-test-plan** - Create QA test plan against requirements

▶️ CONTINUE:
3️⃣  Type **aire-dev-implement**


💡 Recommended flow: aire-review-code → aire-qa-test-plan → implement next story

Type your choice (e.g., "aire-review-code" or "pick next from github")
```

**Tell me which story to implement, then type "proceed".**


