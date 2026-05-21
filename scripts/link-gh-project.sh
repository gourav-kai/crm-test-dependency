#!/usr/bin/env bash
# Add each issue to GitHub Project #9 and set Story Points.
# No Release field set (no build cycles in this plan).
set -euo pipefail
ORG=abhigyanranjan-pixel
REPO=crm-test-dependency
PROJECT_ID=PVT_kwHODiMi4c4BYIe4
SP_FIELD_ID=PVTF_lAHODiMi4c4BYIe4zhTQcmA

# size → story points
declare -A POINTS_FOR_SIZE=( [XS]=1 [S]=2 [M]=3 [L]=8 )

# Same SIZE array as in create-gh-issues.sh
declare -A SIZE=(
  [1.1]="M" [1.2]="M" [1.3]="M" [1.4]="S"
  [2.1]="S" [2.2]="M" [2.3]="M" [2.4]="S"
  [3.1]="S" [3.2]="S" [3.3]="M"
  [4.1]="M" [4.2]="S" [4.3]="M" [4.4]="M" [4.5]="M" [4.6]="M"
  [5.1]="S" [5.2]="M"
  [6.1]="S" [6.2]="M" [6.3]="M"
)

while read -r sid num; do
  size="${SIZE[$sid]}"
  pts="${POINTS_FOR_SIZE[$size]}"
  node_id=$(gh api "repos/$ORG/$REPO/issues/$num" --jq .node_id)
  item_id=$(gh api graphql -f query='mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}' -f p="$PROJECT_ID" -f c="$node_id" --jq .data.addProjectV2ItemById.item.id)
  gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$n:Float!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{number:$n}}){projectV2Item{id}}}' -f p="$PROJECT_ID" -f i="$item_id" -f f="$SP_FIELD_ID" -F n="$pts" >/dev/null
  echo "OK  $sid (#$num) → project item $item_id, $pts pts"
done < docs/plans/.github-issue-map.txt

echo
echo "All issues linked to Project #9 with Story Points."
