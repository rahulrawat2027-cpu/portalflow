#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"
PORTALFLOW_NODE="/Users/rahul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [[ ! -x "$PORTALFLOW_NODE" ]]; then PORTALFLOW_NODE="$(command -v node)"; fi
exec "$PORTALFLOW_NODE" server/server.cjs
