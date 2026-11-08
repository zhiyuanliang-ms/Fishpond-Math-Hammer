#!/usr/bin/env bash
# Create or update the "Fishpond Usage" Azure Workbook from infra/workbook.json.
# Needs `az login` with access to the fishpond-math-hammer resource group.
set -euo pipefail

SUB=d1dd1095-c1f2-4b65-ac28-001b1b806f43
RG=fishpond-math-hammer
WORKBOOK_ID=451b4159-ba3a-45d5-acdf-56c7df7b0416
AI_ID="/subscriptions/$SUB/resourceGroups/$RG/providers/microsoft.insights/components/fishpond-math-hammer"

cd "$(dirname "$0")"
body=$(mktemp)
trap 'rm -f "$body"' EXIT

python3 - "$AI_ID" "$body" <<'EOF'
import json, sys
ai_id, out = sys.argv[1], sys.argv[2]
with open("workbook.json") as f:
    workbook = json.load(f)
body = {
    "location": "eastus",
    "kind": "shared",
    "properties": {
        "displayName": "Fishpond Usage",
        "category": "workbook",
        "sourceId": ai_id,
        "serializedData": json.dumps(workbook, ensure_ascii=False),
    },
}
with open(out, "w") as f:
    json.dump(body, f, ensure_ascii=False)
EOF

az rest --method put \
  --url "https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Insights/workbooks/$WORKBOOK_ID?api-version=2022-04-01" \
  --body "@$body" \
  --query "properties.displayName" -o tsv
