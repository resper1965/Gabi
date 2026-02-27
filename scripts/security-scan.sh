#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Gabi Platform — Local Security Scan
# Run before pushing to catch issues early.
# Usage: ./scripts/security-scan.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
pass()   { echo -e "${GREEN}✅ $1${NC}"; ((PASS++)); }
fail()   { echo -e "${RED}❌ $1${NC}"; ((FAIL++)); }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; ((WARN++)); }

cd "$(dirname "$0")/.."

# ── 1. SAST: Bandit ──
header "SAST — Bandit (Python Security Linter)"
if command -v bandit &>/dev/null; then
    if bandit -r api/app/ -ll -ii --skip B101 -q 2>/dev/null; then
        pass "No high/medium severity issues"
    else
        fail "Bandit found security issues"
    fi
else
    warn "bandit not installed (pip install bandit)"
fi

# ── 2. SCA: pip-audit ──
header "SCA — pip-audit (Dependency Vulnerabilities)"
if command -v pip-audit &>/dev/null; then
    if pip-audit --requirement api/requirements.txt --skip-editable 2>/dev/null; then
        pass "No known vulnerabilities in dependencies"
    else
        fail "Vulnerable dependencies found"
    fi
else
    warn "pip-audit not installed (pip install pip-audit)"
fi

# ── 3. Secrets: gitleaks ──
header "Secrets — gitleaks (Credential Detection)"
if command -v gitleaks &>/dev/null; then
    if gitleaks detect --source . --no-banner -q 2>/dev/null; then
        pass "No secrets detected in repository"
    else
        fail "Potential secrets found in code"
    fi
else
    warn "gitleaks not installed (brew install gitleaks / go install)"
fi

# ── 4. Python Type Checking ──
header "Lint — ruff (Python Linting)"
if command -v ruff &>/dev/null; then
    if ruff check api/app/ --quiet 2>/dev/null; then
        pass "No linting issues"
    else
        warn "Linting issues found (non-blocking)"
    fi
else
    warn "ruff not installed (pip install ruff)"
fi

# ── 5. Large Files Check ──
header "Repo — Large Files Check"
LARGE_FILES=$(find . -not -path './.git/*' -not -path './.venv/*' -not -path './node_modules/*' -type f -size +1M 2>/dev/null | head -10)
if [ -z "$LARGE_FILES" ]; then
    pass "No files >1MB outside .git/.venv"
else
    warn "Large files found:\n$LARGE_FILES"
fi

# ── 6. Private Keys Check ──
header "Secrets — Private Key Detection"
PK_FILES=$(grep -rl "PRIVATE KEY" --include="*.pem" --include="*.key" --include="*.env" . 2>/dev/null | grep -v .git | grep -v .venv | head -5)
if [ -z "$PK_FILES" ]; then
    pass "No private key files detected"
else
    fail "Private key files found:\n$PK_FILES"
fi

# ── Summary ──
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAIL -gt 0 ]; then
    echo -e "\n${RED}Security scan FAILED — fix issues before pushing.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Security scan PASSED ✅${NC}"
exit 0
