#!/usr/bin/env bash
set -euo pipefail
cd /workspace/urban-feedback
export npm_config_cache=/workspace/.npm-cache
# Use the preinstalled Node.js 24 runtime.
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run setup
docker compose pull sqlserver
npm run build
