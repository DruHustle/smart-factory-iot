#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' 'Production deployment uses .github/workflows/release.yml (Vercel + the tested Render bundle).' 'Read RENDER_DEPLOYMENT.md, configure production secrets, and run the release workflow with full backend and edge commit SHAs.' 'This helper performs no Git branch changes, force pushes, or deployment.'
