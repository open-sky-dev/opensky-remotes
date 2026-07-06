#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../packages/remotes"

bun install --frozen-lockfile
bun --bun run lint
