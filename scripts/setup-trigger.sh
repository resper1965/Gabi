#!/usr/bin/env bash
# ── Gabi Hub — Setup Build Trigger ──
set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
REPO_NAME="Gabi" # Adjust if your repo name in GCP is different
REGION="us-central1"

echo "Using Project ID: ${PROJECT_ID}"

# Recreate/Update Trigger
echo "Creating/Updating Cloud Build Trigger..."

# Note: This assumes the repository is already connected to GCP via 2nd gen connection.
# If not, the user might need to connect it first in the UI.

gcloud beta builds triggers create cidr \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --name="gabi-deploy" \
    --repository="projects/${PROJECT_ID}/locations/${REGION}/connections/github/repositories/${REPO_NAME}" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --description="Deploy Gabi Web and API on push to main" \
    2>/dev/null || echo "Trigger already exists or manual connection required."

echo "✅ Trigger setup attempted. Please verify in GCP Console: https://console.cloud.google.com/cloud-build/triggers?project=${PROJECT_ID}"
