#!/usr/bin/env bash
# ── Gabi Hub — Setup IAM Permissions ──
# Run this once or when creating new services to allow public access.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-us-central1}"

echo "═══════════════════════════════════════════"
echo "  Setting Public IAM Access — ${PROJECT_ID}"
echo "═══════════════════════════════════════════"

echo ""
echo "🔓 Configuring gabi-api..."
gcloud run services add-iam-policy-binding gabi-api \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet

echo "🔓 Configuring gabi-web..."
gcloud run services add-iam-policy-binding gabi-web \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet

echo ""
echo "✅ IAM Configuration complete. Services are now public."
echo "═══════════════════════════════════════════"
