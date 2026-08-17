#!/usr/bin/env bash
# Copy the built plugin into a vault's plugin folder.
# Usage: ./scripts/install.sh /path/to/vault
set -euo pipefail

VAULT="${1:-}"
if [ -z "$VAULT" ]; then
  echo "usage: $0 /path/to/vault" >&2
  exit 1
fi
if [ ! -d "$VAULT/.obsidian" ]; then
  echo "error: $VAULT does not look like an Obsidian vault (no .obsidian folder)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$ROOT/main.js" ]; then
  echo "error: main.js not found — run 'npm run build' first" >&2
  exit 1
fi

DEST="$VAULT/.obsidian/plugins/html-viewer"
mkdir -p "$DEST"
cp "$ROOT/main.js" "$ROOT/manifest.json" "$ROOT/styles.css" "$DEST/"
echo "Installed to $DEST"
echo "Enable 'HTML Viewer' in Settings -> Community plugins (restart Obsidian first)."
