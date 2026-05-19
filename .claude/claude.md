<!-- AIRE-SDLC-FRAMEWORK:START -->
# AIRE SDLC Agentic Framework Instructions

# AIRE SDLC Agentic Framework - Claude Code Instructions

> This project uses **AIRE SDLC Agentic Framework** for structured software development.

---

## AIRE SDLC Agentic Framework Method Workflows

### Available Workflows

When user says any of these commands, read the corresponding workflow file:

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

### Quick Start

**Brownfield (existing code)**:
1. `aire-brownfield-inspect` - System discovery
2. `aire-brownfield-deep-dive` - Pattern extraction
3. `aire-brownfield-requirements` - Requirements from analysis
4. `aire-brownfield-architecture` - Target state architecture design
5. `aire-brownfield-patterns` - Compare existing vs recommended patterns; define standards
6. `aire-build-cycles` - Break into build cycles
7. `aire-ui-ux-design` - UI/UX specification (optional, for UI features)
8. `aire-brownfield-plan` - Implementation planning


**Greenfield (new project)**:
1. `aire-greenfield-requirements` - Requirements
2. `aire-greenfield-architecture` - Architecture
3. `aire-greenfield-patterns` - Coding standards
4. `aire-build-cycles` - Break into build cycles 
5. `aire-ui-ux-design` - UI/UX specification (optional, for UI projects)
6. `aire-greenfield-plan` - Implementation plan

**DevOps**:
1. `aire-devops-discover` - Auto-detect app profile + gather deployment requirements
2. `aire-devops-pipeline` - Create CI/CD pipeline (GitHub Actions)
3. `aire-devops-deploy` - Full deployment setup (infra + SSL + monitoring + runbooks)
4. `aire-devops-infra-evolve` - Brownfield infra evolution (analyze existing IaC/pipelines, design architecture, plan changes)


### Reference Documents (CRITICAL)

**ALWAYS check `SPEC/references/` first before any design or planning task.**

If reference documents exist (PRD, architecture, Figma designs, etc.):
- 🔴 **STRICTLY FOLLOW** the reference - do not suggest changes
- 🔴 **DO NOT MODIFY** existing feature definitions
- 🔴 **IMPLEMENT** exactly as specified

### Workflow Execution Protocol

1. **Check** `SPEC/references/` for existing documents
2. **Read** the workflow file from `SPEC/workflows/`
3. **Read** the agent definition from `SPEC/agents/`
4. **Read** the relevant rulebook from `SPEC/rulebooks/`
5. **Ask** "Type 'proceed' to start" and wait for confirmation
6. **Execute** following the checklist exactly
7. **Document** outputs in `docs/`

### Configuration Files

| Type | Location |
|------|----------|
| Agent Definitions | `SPEC/agents/` |
| Rulebooks | `SPEC/rulebooks/` |
| Workflows | `SPEC/workflows/` |
| Reference Docs | `SPEC/references/` |

---

## Core Rules

1. **Reference First** - Check SPEC/references/ before any design task
2. **Zero Assumptions** - Ask clarifying questions when uncertain
3. **Evidence-Based** - Paste actual test output as proof
4. **Tests with Code** - Never postpone tests (≥85% coverage)
5. **User Approval** - Ask "proceed?" before major actions

---
<!-- AIRE-SDLC-FRAMEWORK:END -->

# AIRE SDLC Agentic Framework - Claude Code Instructions

> This project uses **AIRE SDLC Agentic Framework** for structured software development.

---

## AIRE SDLC Agentic Framework Method Workflows

### Available Workflows

When user says any of these commands, read the corresponding workflow file:

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

### Quick Start

**Brownfield (existing code)**:
1. `aire-brownfield-inspect` - System discovery
2. `aire-brownfield-deep-dive` - Pattern extraction
3. `aire-brownfield-requirements` - Requirements from analysis
4. `aire-brownfield-architecture` - Target state architecture design
5. `aire-brownfield-patterns` - Compare existing vs recommended patterns; define standards
6. `aire-build-cycles` - Break into build cycles
7. `aire-ui-ux-design` - UI/UX specification (optional, for UI features)
8. `aire-brownfield-plan` - Implementation planning


**Greenfield (new project)**:
1. `aire-greenfield-requirements` - Requirements
2. `aire-greenfield-architecture` - Architecture
3. `aire-greenfield-patterns` - Coding standards
4. `aire-build-cycles` - Break into build cycles 
5. `aire-ui-ux-design` - UI/UX specification (optional, for UI projects)
6. `aire-greenfield-plan` - Implementation plan

**DevOps**:
1. `aire-devops-discover` - Auto-detect app profile + gather deployment requirements
2. `aire-devops-pipeline` - Create CI/CD pipeline (GitHub Actions)
3. `aire-devops-deploy` - Full deployment setup (infra + SSL + monitoring + runbooks)
4. `aire-devops-infra-evolve` - Brownfield infra evolution (analyze existing IaC/pipelines, design architecture, plan changes)


### Reference Documents (CRITICAL)

**ALWAYS check `SPEC/references/` first before any design or planning task.**

If reference documents exist (PRD, architecture, Figma designs, etc.):
- 🔴 **STRICTLY FOLLOW** the reference - do not suggest changes
- 🔴 **DO NOT MODIFY** existing feature definitions
- 🔴 **IMPLEMENT** exactly as specified

### Workflow Execution Protocol

1. **Check** `SPEC/references/` for existing documents
2. **Read** the workflow file from `SPEC/workflows/`
3. **Read** the agent definition from `SPEC/agents/`
4. **Read** the relevant rulebook from `SPEC/rulebooks/`
5. **Ask** "Type 'proceed' to start" and wait for confirmation
6. **Execute** following the checklist exactly
7. **Document** outputs in `docs/`

### Configuration Files

| Type | Location |
|------|----------|
| Agent Definitions | `SPEC/agents/` |
| Rulebooks | `SPEC/rulebooks/` |
| Workflows | `SPEC/workflows/` |
| Reference Docs | `SPEC/references/` |

---

## Core Rules

1. **Reference First** - Check SPEC/references/ before any design task
2. **Zero Assumptions** - Ask clarifying questions when uncertain
3. **Evidence-Based** - Paste actual test output as proof
4. **Tests with Code** - Never postpone tests (≥85% coverage)
5. **User Approval** - Ask "proceed?" before major actions

---
