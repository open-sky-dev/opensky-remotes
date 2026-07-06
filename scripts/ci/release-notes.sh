#!/usr/bin/env bash
set -euo pipefail

# Prints the CHANGELOG.md section for a version (e.g. "v0.1.0" or "0.1.0") to stdout.
# Fails if the changelog has no section for that version.

cd "$(dirname "$0")/../../packages/remotes"

version="${1#v}"

notes="$(awk -v heading="## [$version]" '
	index($0, heading) == 1 { found=1; next }
	found && /^## / { exit }
	found { print }
' CHANGELOG.md)"

if [[ -z "${notes//[[:space:]]/}" ]]; then
	echo "No changelog section found for version $version in packages/remotes/CHANGELOG.md" >&2
	exit 1
fi

printf '%s\n' "$notes"
