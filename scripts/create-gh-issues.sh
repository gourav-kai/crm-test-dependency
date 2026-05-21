#!/usr/bin/env bash
# One-shot: create 22 GitHub Issues for the Mvp-CRM plan, verify each URL,
# capture the issue number into a per-story map. Idempotency: if "Story N.M:" already
# exists in the repo, the existing number is reused (no duplicate).
set -euo pipefail
ORG=abhigyanranjan-pixel
REPO=crm-test-dependency

declare -A EPIC_TITLE=(
  [1]="Epic 1: Project Foundation"
  [2]="Epic 2: Authentication"
  [3]="Epic 3: User Management"
  [4]="Epic 4: Lead Management"
  [5]="Epic 5: Analytics Dashboard"
  [6]="Epic 6: Weekly Email Digest"
)

# Story IDs in dependency order
STORY_IDS=(1.1 1.2 1.3 1.4 2.1 2.2 2.3 2.4 3.1 3.2 3.3 4.1 4.2 4.3 4.4 4.5 4.6 5.1 5.2 6.1 6.2 6.3)

# Titles (terse) — full content lives in the linked story file
declare -A TITLE=(
  [1.1]="Backend skeleton"
  [1.2]="Frontend skeleton"
  [1.3]="DB foundation (client, migrations, initial schema, seed)"
  [1.4]="Connect FE to BE (health check on home page)"
  [2.1]="Auth middleware + JWT verify + requireRole + rate limiter"
  [2.2]="Auth service + /auth/login + /auth/me"
  [2.3]="Frontend AuthProvider + LoginPage + RequireAuth/RequireRole"
  [2.4]="Auth integration tests (Supertest + MSW)"
  [3.1]="Users repository + service (list, create, patch)"
  [3.2]="Users routes (GET/POST/PATCH /users, admin-only)"
  [3.3]="Frontend UsersAdminPage (list, create, deactivate)"
  [4.1]="Leads repository (prepared statements, role-scoped queries)"
  [4.2]="Leads service (role scope enforcement, stage transitions)"
  [4.3]="Leads routes (CRUD + stage transition)"
  [4.4]="Frontend LeadsListPage (filter, search, role-aware columns)"
  [4.5]="Frontend LeadFormPage (create + edit, RHF + Zod)"
  [4.6]="Frontend stage transition UI (LeadDetailPage + StageStepper)"
  [5.1]="Analytics service + routes (leads-per-person, leads-by-stage)"
  [5.2]="Frontend DashboardPage (2 Recharts bar charts)"
  [6.1]="Mailer + digest repository"
  [6.2]="Digest service (runWeeklyDigest, per-recipient try/catch)"
  [6.3]="Scheduler + admin endpoints + digest CLI"
)

declare -A SLUG=(
  [1.1]="epic-1-story-1.1-backend-skeleton"
  [1.2]="epic-1-story-1.2-frontend-skeleton"
  [1.3]="epic-1-story-1.3-db-foundation"
  [1.4]="epic-1-story-1.4-connect-fe-be"
  [2.1]="epic-2-story-2.1-auth-middleware"
  [2.2]="epic-2-story-2.2-auth-service-routes"
  [2.3]="epic-2-story-2.3-frontend-auth"
  [2.4]="epic-2-story-2.4-auth-integration-tests"
  [3.1]="epic-3-story-3.1-users-repository-service"
  [3.2]="epic-3-story-3.2-users-routes"
  [3.3]="epic-3-story-3.3-frontend-users-admin-page"
  [4.1]="epic-4-story-4.1-leads-repository"
  [4.2]="epic-4-story-4.2-leads-service"
  [4.3]="epic-4-story-4.3-leads-routes"
  [4.4]="epic-4-story-4.4-frontend-leads-list-page"
  [4.5]="epic-4-story-4.5-frontend-lead-form-page"
  [4.6]="epic-4-story-4.6-frontend-stage-transition"
  [5.1]="epic-5-story-5.1-analytics-service-routes"
  [5.2]="epic-5-story-5.2-frontend-dashboard-page"
  [6.1]="epic-6-story-6.1-mailer-digest-repository"
  [6.2]="epic-6-story-6.2-digest-service"
  [6.3]="epic-6-story-6.3-scheduler-admin-endpoints"
)

# Story sizing: backend foundational + repository = M (3-5); UI page = M; integration tests, scheduler = M; simple = S
declare -A SIZE=(
  [1.1]="M" [1.2]="M" [1.3]="M" [1.4]="S"
  [2.1]="S" [2.2]="M" [2.3]="M" [2.4]="S"
  [3.1]="S" [3.2]="S" [3.3]="M"
  [4.1]="M" [4.2]="S" [4.3]="M" [4.4]="M" [4.5]="M" [4.6]="M"
  [5.1]="S" [5.2]="M"
  [6.1]="S" [6.2]="M" [6.3]="M"
)

out_map=docs/plans/.github-issue-map.txt
: > "$out_map"

for sid in "${STORY_IDS[@]}"; do
  epic="${sid%%.*}"
  title="Story $sid: ${TITLE[$sid]}"
  slug="${SLUG[$sid]}"
  ms="${EPIC_TITLE[$epic]}"
  size="${SIZE[$sid]}"

  # Idempotency: search for existing issue with this title
  existing=$(gh issue list --repo "$ORG/$REPO" --state all --search "in:title \"Story $sid:\"" --json number,title --jq ".[] | select(.title==\"$title\") | .number" | head -1)
  if [[ -n "$existing" ]]; then
    echo "SKIP  Story $sid → #$existing (already exists)"
    echo "$sid $existing" >> "$out_map"
    continue
  fi

  body=$(cat <<EOF
## User Story
Story file: \`docs/plans/stories/${slug}.md\`

See the linked story file for full Description, Acceptance Criteria, Implementation Steps, Tests, Quality, OUT-of-scope, and Evidence requirements.

## Epic
${ms}

## Dependencies
See \`docs/plans/dependency-graph.yml\` for \`requires\` / \`enables\` / \`files_touched\` / \`assignee\`. Run \`aire next-parallel --by-dev\` to find what's ready.

## Definition of Done
- All Acceptance Criteria in the story file pass.
- Vitest passes; ≥85% coverage on changed files (≥90% on critical files).
- ESLint 0 errors; Prettier clean.
- Patterns followed (see \`docs/architecture/design/01-patterns-and-standards-greenfield.md\`).
- Story tracker in \`docs/status.md\` updated with Start/End timestamps.
EOF
)

  url=$(gh issue create --repo "$ORG/$REPO" \
    --title "$title" \
    --body "$body" \
    --label "story" --label "epic:$epic" --label "$size" --label "P2-medium" \
    --milestone "$ms")

  if [[ ! "$url" =~ ^https://github\.com/[^/]+/[^/]+/issues/[0-9]+$ ]]; then
    echo "ERROR: unexpected create output for $sid: $url" >&2
    exit 1
  fi
  num="${url##*/}"
  echo "OK    Story $sid → #$num  $url"
  echo "$sid $num" >> "$out_map"
done

echo
echo "All issues created. Map: $out_map"
