#!/usr/bin/env bash
# ── Gabi Hub — Manual Deploy Script ──
# Prerequisites: gcloud CLI authenticated, Docker running
set -euo pipefail

# ── Config ──
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO="gabi"
TAG="${1:-latest}"

AR="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

echo "═══════════════════════════════════════════"
echo "  Gabi Hub Deploy — ${PROJECT_ID} (${REGION})"
echo "═══════════════════════════════════════════"

# ── Step 0: Ensure Artifact Registry exists ──
echo ""
echo "📦 Checking Artifact Registry..."
gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" --project="${PROJECT_ID}" 2>/dev/null || \
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --description="Gabi Hub container images"
echo "✅ Artifact Registry ready."

# ── Step 1: Build ──
echo ""
echo "🔨 Building API image..."
docker build -t "${AR}/gabi-api:${TAG}" ./api

echo "🔨 Building Web image..."
docker build -f web/Dockerfile -t "${AR}/gabi-web:${TAG}" .

# ── Step 2: Push ──
echo ""
echo "📤 Pushing images..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker push "${AR}/gabi-api:${TAG}"
docker push "${AR}/gabi-web:${TAG}"

# ── Step 3: Deploy API ──
echo ""
echo "🚀 Deploying API to Cloud Run..."
gcloud run deploy gabi-api \
  --image="${AR}/gabi-api:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --memory=1Gi --cpu=1 \
  --min-instances=0 --max-instances=3 \
  --port=8080 \
  --set-env-vars="GABI_GCP_PROJECT_ID=${PROJECT_ID},GABI_VERTEX_AI_LOCATION=${REGION}" \
  --set-secrets="GABI_DATABASE_URL=GABI_DATABASE_URL:latest,GABI_FIREBASE_ADMIN_SERVICE_ACCOUNT=GABI_FIREBASE_ADMIN_SA:latest" \
  --project="${PROJECT_ID}"

API_URL=$(gcloud run services describe gabi-api --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "✅ API deployed: ${API_URL}"

# ── Step 4: Deploy Web ──
echo ""
echo "🚀 Deploying Web to Cloud Run..."
gcloud run deploy gabi-web \
  --image="${AR}/gabi-web:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances=3 \
  --port=3000 \
  --project="${PROJECT_ID}"

WEB_URL=$(gcloud run services describe gabi-web --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "✅ Web deployed: ${WEB_URL}"

# ── Summary ──
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ DEPLOY COMPLETE"
echo "  API: ${API_URL}"
echo "  Web: ${WEB_URL}"
echo "═══════════════════════════════════════════"
