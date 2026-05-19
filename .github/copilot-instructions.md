<!-- AIRE-SDLC-FRAMEWORK:START -->
# AIRE SDLC Agentic Framework Instructions

# AIRE SDLC Agentic Framework - GitHub Copilot Instructions

> This project uses **AIRE SDLC Agentic Framework** for structured software development.

---

## Workflows

**Brownfield (Existing Code)**:
- `aire-brownfield-inspect` → System discovery
- `aire-brownfield-deep-dive` → Pattern extraction
- `aire-brownfield-requirements` → Requirements from analysis
- `aire-brownfield-architecture` → Target state architecture design
- `aire-brownfield-patterns` → Compare existing vs recommended patterns; define standards
- `aire-build-cycles` → Break into build cycles
- `aire-ui-ux-design` → UI/UX spec (optional, for UI features)
- `aire-brownfield-plan` → Implementation planning


**Greenfield (New Projects)**:
- `aire-greenfield-requirements` → Requirements
- `aire-greenfield-architecture` → Architecture
- `aire-greenfield-patterns` → Coding standards
- `aire-build-cycles` → Break into build cycles 
- `aire-ui-ux-design` → UI/UX spec (optional, for UI projects)
- `aire-greenfield-plan` → Implementation plan

**DevOps**:
- `aire-devops-discover` → Auto-detect app profile + gather deployment requirements
- `aire-devops-pipeline` → Create CI/CD pipeline (GitHub Actions)
- `aire-devops-deploy` → Full deployment setup (infra + SSL + monitoring + runbooks)
- `aire-devops-infra-evolve` → Brownfield infra evolution (analyze existing IaC/pipelines, design architecture, plan changes)

**All Workflows**:

| Command | Workflow File |
|---------|---------------|
| `aire-brownfield-inspect` | `SPEC/workflows/aire-brownfield-inspect.md` |
| `aire-brownfield-deep-dive` | `SPEC/workflows/aire-brownfield-deep-dive.md` |
| `aire-brownfield-requirements` | `SPEC/workflows/aire-brownfield-requirements.md` |
| `aire-brownfield-architecture` | `SPEC/workflows/aire-brownfield-architecture.md` |
| `aire-brownfield-patterns` | `SPEC/workflows/aire-brownfield-patterns.md` |
| `aire-brownfield-plan` | `SPEC/workflows/aire-brownfield-plan.md` |
| `aire-greenfield-requirements` | `SPEC/workflows/aire-greenfield-requirements.md` |
| `aire-greenfield-architecture` | `SPEC/workflows/aire-greenfield-architecture.md` |
| `aire-greenfield-patterns` | `SPEC/workflows/aire-greenfield-patterns.md` |
| `aire-ui-ux-design` | `SPEC/workflows/aire-ui-ux-design.md` |
| `aire-greenfield-plan` | `SPEC/workflows/aire-greenfield-plan.md` |
| `aire-build-cycles` | `SPEC/workflows/aire-build-cycles.md` |
| `aire-project-kickoff` or `aire-kickoff` | `SPEC/workflows/aire-project-kickoff.md` |
| `aire-dev-implement` | `SPEC/workflows/aire-dev-implement.md` |
| `aire-dev-remediate` | `SPEC/workflows/aire-dev-remediate.md` |
| `aire-review-code` | `SPEC/workflows/aire-review-code.md` |
| `aire-qa-test-plan` | `SPEC/workflows/aire-qa-test-plan.md` |
| `aire-qa-validate` | `SPEC/workflows/aire-qa-validate.md` |
| `aire-qa-regression` | `SPEC/workflows/aire-qa-regression.md` |
| `aire-qa-triage` | `SPEC/workflows/aire-qa-triage.md` |
| `aire-devops-discover` | `SPEC/workflows/aire-devops-discover.md` |
| `aire-devops-pipeline` | `SPEC/workflows/aire-devops-pipeline.md` |
| `aire-devops-deploy` | `SPEC/workflows/aire-devops-deploy.md` |
| `aire-devops-infra-evolve` | `SPEC/workflows/aire-devops-infra-evolve.md` |
---

## Reference Documents (CRITICAL)

**ALWAYS check `SPEC/references/` before any design or planning task.**

- 🔴 **STRICTLY FOLLOW** reference documents
- 🔴 **IMPLEMENT** exactly as specified

---

## Workflow Protocol

1. Check `SPEC/references/` for existing documents
2. Read workflow from `SPEC/workflows/`
3. Read agent from `SPEC/agents/`
4. Read rulebook from `SPEC/rulebooks/`
5. Ask "proceed?" before starting
6. Document outputs in `docs/`

---

## Core Rules

1. Reference First - Check SPEC/references/
2. Zero Assumptions - Ask questions
3. Evidence-Based - Show test output
4. Tests with Code - ≥85% coverage
5. User Approval - Ask "proceed?"


---

## Implementation Workflow (aire-dev-implement / implement story)

When user says **"implement story X.Y"** or **"implement next story"**:


### Before Starting
1. Read `SPEC/agents/AIRE_DEV.md`
2. Read `SPEC/rulebooks/aire-implementation-rulebook.md`
3. Read `docs/plans/implementation-plan.md`
4. Read `SPEC/workflows/aire-dev-implement.md`
5. Ask user: "Type 'proceed' to start"

### TDD Process (IN ORDER)
1. **Write tests FIRST** (TDD approach)
2. Implement code to pass tests
3. Run unit tests: **MUST pass 100%**
4. Write integration/E2E tests
5. Run ALL tests: **MUST pass 100%**
6. Check coverage: **≥85% required**
7. Fix all lint errors

### Documentation
- Update `docs/plans/implementation-plan.md` with status
- Create `docs/stories-implemented/story-[N.M]-review.md` with:
  - Actual test output
  - Coverage numbers
  - Linter results

### Critical Rules
🔴 Tests WITH code - never postpone
🔴 Run ALL tests after every change
🔴 Execute items IN ORDER
🔴 Update status with EVIDENCE
🔴 No TODO comments
🔴 Zero lint errors

### After Completion
Present options:
1. aire-review-code → Code review
2. implement next story → Continue
3. pause → Resume later

---
<!-- AIRE-SDLC-FRAMEWORK:END -->

# AIRE SDLC Agentic Framework - GitHub Copilot Instructions

> This project uses **AIRE SDLC Agentic Framework** for structured software development.

---

## Workflows

**Brownfield (Existing Code)**:
- `aire-brownfield-inspect` → System discovery
- `aire-brownfield-deep-dive` → Pattern extraction
- `aire-brownfield-requirements` → Requirements from analysis
- `aire-brownfield-architecture` → Target state architecture design
- `aire-brownfield-patterns` → Compare existing vs recommended patterns; define standards
- `aire-build-cycles` → Break into build cycles
- `aire-ui-ux-design` → UI/UX spec (optional, for UI features)
- `aire-brownfield-plan` → Implementation planning


**Greenfield (New Projects)**:
- `aire-greenfield-requirements` → Requirements
- `aire-greenfield-architecture` → Architecture
- `aire-greenfield-patterns` → Coding standards
- `aire-build-cycles` → Break into build cycles 
- `aire-ui-ux-design` → UI/UX spec (optional, for UI projects)
- `aire-greenfield-plan` → Implementation plan

**DevOps**:
- `aire-devops-discover` → Auto-detect app profile + gather deployment requirements
- `aire-devops-pipeline` → Create CI/CD pipeline (GitHub Actions)
- `aire-devops-deploy` → Full deployment setup (infra + SSL + monitoring + runbooks)
- `aire-devops-infra-evolve` → Brownfield infra evolution (analyze existing IaC/pipelines, design architecture, plan changes)

**All Workflows**:

| Command | Workflow File |
|---------|---------------|
| `aire-brownfield-inspect` | `SPEC/workflows/aire-brownfield-inspect.md` |
| `aire-brownfield-deep-dive` | `SPEC/workflows/aire-brownfield-deep-dive.md` |
| `aire-brownfield-requirements` | `SPEC/workflows/aire-brownfield-requirements.md` |
| `aire-brownfield-architecture` | `SPEC/workflows/aire-brownfield-architecture.md` |
| `aire-brownfield-patterns` | `SPEC/workflows/aire-brownfield-patterns.md` |
| `aire-brownfield-plan` | `SPEC/workflows/aire-brownfield-plan.md` |
| `aire-greenfield-requirements` | `SPEC/workflows/aire-greenfield-requirements.md` |
| `aire-greenfield-architecture` | `SPEC/workflows/aire-greenfield-architecture.md` |
| `aire-greenfield-patterns` | `SPEC/workflows/aire-greenfield-patterns.md` |
| `aire-ui-ux-design` | `SPEC/workflows/aire-ui-ux-design.md` |
| `aire-greenfield-plan` | `SPEC/workflows/aire-greenfield-plan.md` |
| `aire-build-cycles` | `SPEC/workflows/aire-build-cycles.md` |
| `aire-project-kickoff` or `aire-kickoff` | `SPEC/workflows/aire-project-kickoff.md` |
| `aire-dev-implement` | `SPEC/workflows/aire-dev-implement.md` |
| `aire-dev-remediate` | `SPEC/workflows/aire-dev-remediate.md` |
| `aire-review-code` | `SPEC/workflows/aire-review-code.md` |
| `aire-qa-test-plan` | `SPEC/workflows/aire-qa-test-plan.md` |
| `aire-qa-validate` | `SPEC/workflows/aire-qa-validate.md` |
| `aire-qa-regression` | `SPEC/workflows/aire-qa-regression.md` |
| `aire-qa-triage` | `SPEC/workflows/aire-qa-triage.md` |
| `aire-devops-discover` | `SPEC/workflows/aire-devops-discover.md` |
| `aire-devops-pipeline` | `SPEC/workflows/aire-devops-pipeline.md` |
| `aire-devops-deploy` | `SPEC/workflows/aire-devops-deploy.md` |
| `aire-devops-infra-evolve` | `SPEC/workflows/aire-devops-infra-evolve.md` |
---

## Reference Documents (CRITICAL)

**ALWAYS check `SPEC/references/` before any design or planning task.**

- 🔴 **STRICTLY FOLLOW** reference documents
- 🔴 **IMPLEMENT** exactly as specified

---

## Workflow Protocol

1. Check `SPEC/references/` for existing documents
2. Read workflow from `SPEC/workflows/`
3. Read agent from `SPEC/agents/`
4. Read rulebook from `SPEC/rulebooks/`
5. Ask "proceed?" before starting
6. Document outputs in `docs/`

---

## Core Rules

1. Reference First - Check SPEC/references/
2. Zero Assumptions - Ask questions
3. Evidence-Based - Show test output
4. Tests with Code - ≥85% coverage
5. User Approval - Ask "proceed?"


---

## Implementation Workflow (aire-dev-implement / implement story)

When user says **"implement story X.Y"** or **"implement next story"**:


### Before Starting
1. Read `SPEC/agents/AIRE_DEV.md`
2. Read `SPEC/rulebooks/aire-implementation-rulebook.md`
3. Read `docs/plans/implementation-plan.md`
4. Read `SPEC/workflows/aire-dev-implement.md`
5. Ask user: "Type 'proceed' to start"

### TDD Process (IN ORDER)
1. **Write tests FIRST** (TDD approach)
2. Implement code to pass tests
3. Run unit tests: **MUST pass 100%**
4. Write integration/E2E tests
5. Run ALL tests: **MUST pass 100%**
6. Check coverage: **≥85% required**
7. Fix all lint errors

### Documentation
- Update `docs/plans/implementation-plan.md` with status
- Create `docs/stories-implemented/story-[N.M]-review.md` with:
  - Actual test output
  - Coverage numbers
  - Linter results

### Critical Rules
🔴 Tests WITH code - never postpone
🔴 Run ALL tests after every change
🔴 Execute items IN ORDER
🔴 Update status with EVIDENCE
🔴 No TODO comments
🔴 Zero lint errors

### After Completion
Present options:
1. aire-review-code → Code review
2. implement next story → Continue
3. pause → Resume later

---

