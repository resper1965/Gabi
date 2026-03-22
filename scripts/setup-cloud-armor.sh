#!/bin/bash
# Gabi Hub — Cloud Armor Rate Limiting Setup
# Run once to create the security policy and attach to Cloud Run backend.
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - External HTTPS Load Balancer configured for Cloud Run
#   - PROJECT_ID set
#
# Usage: bash scripts/setup-cloud-armor.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-$(gcloud config get-value project)}"
POLICY_NAME="gabi-rate-limit"
REGION="southamerica-east1"

echo "🛡️  Creating Cloud Armor policy: ${POLICY_NAME}"

# Create security policy
gcloud compute security-policies create "${POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --description="Gabi Hub — Rate limiting and DDoS protection"

# Rule 1: Rate limit API endpoints — 60 req/min per IP
gcloud compute security-policies rules create 1000 \
  --security-policy="${POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --expression="request.path.matches('/api/.*')" \
  --action="throttle" \
  --rate-limit-threshold-count=60 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action="allow" \
  --exceed-action="deny-429" \
  --enforce-on-key="IP" \
  --description="API rate limit: 60 req/min per IP"

# Rule 2: Stricter limit for AI endpoints — 20 req/min per IP
gcloud compute security-policies rules create 900 \
  --security-policy="${POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --expression="request.path.matches('/api/v1/law/.*') || request.path.matches('/api/v1/ntalk/.*')" \
  --action="throttle" \
  --rate-limit-threshold-count=20 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action="allow" \
  --exceed-action="deny-429" \
  --enforce-on-key="IP" \
  --description="AI endpoint rate limit: 20 req/min per IP"

# Rule 3: Block common attack patterns
gcloud compute security-policies rules create 800 \
  --security-policy="${POLICY_NAME}" \
  --project="${PROJECT_ID}" \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable') || evaluatePreconfiguredExpr('sqli-v33-stable')" \
  --action="deny-403" \
  --description="Block XSS and SQLi attacks (OWASP CRS)"

echo ""
echo "✅ Policy '${POLICY_NAME}' created with 3 rules:"
echo "   Priority 800:  Block XSS + SQLi"
echo "   Priority 900:  AI endpoints — 20 req/min/IP"
echo "   Priority 1000: All API — 60 req/min/IP"
echo ""
echo "⚠️  Next step: attach policy to your backend service:"
echo "   gcloud compute backend-services update YOUR_BACKEND \\"
echo "     --security-policy=${POLICY_NAME} --global"
