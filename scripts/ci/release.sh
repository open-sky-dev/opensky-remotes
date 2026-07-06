#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../packages/remotes"

bun install --frozen-lockfile

# Guard against publishing a version that doesn't match the tag that triggered the release
if [[ -n "${GITHUB_REF_NAME:-}" ]]; then
	tag_version="${GITHUB_REF_NAME#v}"
	pkg_version="$(bun -e 'console.log(require("./package.json").version)')"
	if [[ "$tag_version" != "$pkg_version" ]]; then
		echo "Tag $GITHUB_REF_NAME does not match package.json version $pkg_version" >&2
		exit 1
	fi
fi

bun --bun run check
bun --bun run build
# npm (not bun) for the publish itself: trusted publishing (OIDC) needs npm CLI >= 11.5
npm publish
