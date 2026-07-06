#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../packages/remotes"

bun install --frozen-lockfile

# Type-checks the package, including the compile-time type tests (*.test-d.ts)
bun run check

# Runtime tests, once any exist
if find src -name '*.test.ts' -o -name '*.spec.ts' | grep -q .; then
	bun test
fi
