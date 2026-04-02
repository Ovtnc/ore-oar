#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# NOTE:
# Runtime env is injected by PM2 via ecosystem `env_file`.
# Avoid using `node --env-file` here for broader Node.js compatibility on servers.
exec node "$ROOT/node_modules/next/dist/bin/next" start -p 3001
