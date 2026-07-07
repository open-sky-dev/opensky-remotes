#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

bun install --frozen-lockfile

# Type-checks the package, including the compile-time type tests (*.test-d.ts)
bun --bun run check

# Runtime tests (vitest: the runes in .svelte.ts modules need the Svelte
# compiler, and the persist/autoSubmit tests need a DOM — bun test has neither)
bun run --cwd packages/remotes test
