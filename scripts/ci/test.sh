#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

bun install --frozen-lockfile

# Type-checks the package, including the compile-time type tests (*.test-d.ts)
bun --bun run check

# Runtime tests, once any exist
if find packages/remotes/src -name '*.test.ts' -o -name '*.spec.ts' | grep -q .; then
	cd packages/remotes && bun test
fi
