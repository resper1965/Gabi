# Branch Protection & Git Workflow

> Gabi Platform · SDLC Governance

## Branching Strategy

```
main (production-ready)
  └── staging auto-deploy on push
  └── production deploy on tag v*

feature/* → PR → main
hotfix/*  → PR → main (expedited review)
```

## Branch Protection Rules (main)

| Rule | Value |
|------|-------|
| Require pull request | ✅ Yes |
| Required approvals | 1 |
| Dismiss stale reviews | ✅ Yes |
| Require status checks | ✅ test-api, sast-bandit, sca-audit, secrets-scan |
| Require branches up to date | ✅ Yes |
| Require signed commits | ⚠️ Recommended |
| Include administrators | ✅ Yes |
| Allow force pushes | ❌ No |
| Allow deletions | ❌ No |

## GitHub Setup Commands

```bash
# Via GitHub CLI (gh)
gh api repos/resper1965/Gabi/branches/main/protection -X PUT -f \
  required_status_checks='{"strict":true,"contexts":["test-api","sast-bandit","sca-audit","secrets-scan"]}' \
  enforce_admins=true \
  required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  restrictions=null
```

## Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
Scopes: api, web, legal, ghost, data, care, infra, ci, docs

Examples:
  feat(legal): add multi-agent debate for auditor
  fix(api): lazy import vertexai to prevent collection failures
  ci: add SAST/SCA gates to staging pipeline
  docs: add STRIDE threat model
```

## Release Process

```
1. All PRs merged to main
2. CI passes: tests + SAST + SCA + secrets scan
3. Staging auto-deploys and is verified
4. Create release tag: git tag -a v1.2.0 -m "Release 1.2.0"
5. Push tag: git push origin v1.2.0
6. Production CI triggers: tests + security + build + deploy
7. Verify production health
8. Update CHANGELOG.md
```
