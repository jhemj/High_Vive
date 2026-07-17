#!/usr/bin/env bash
set -euo pipefail

SERVER="${HIGH_VIVE_SERVER:-https://high-vive-league.ngmptdz.chatgpt.site}"
INSTALL_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/high-vive"
SOURCE_ROOT="$INSTALL_ROOT/source"

case "$(uname -s)" in
  Darwin) PLATFORM="macOS" ;;
  Linux) PLATFORM="Ubuntu/Linux" ;;
  *) echo "High-Vive currently supports Windows, macOS, and Ubuntu/Linux." >&2; exit 1 ;;
esac

echo "High-Vive · $PLATFORM setup"

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node --version | sed 's/^v//' | cut -d. -f1)"
fi

if [ "$node_major" -lt 22 ]; then
  echo "Installing Node.js 22 with nvm…"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm use 22
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@11.9.0 --activate
  else
    npm install --global pnpm@11.9.0
  fi
fi

mkdir -p "$INSTALL_ROOT"
archive="$(mktemp "${TMPDIR:-/tmp}/high-vive.XXXXXX.tar.gz")"
staging="$(mktemp -d "${TMPDIR:-/tmp}/high-vive.XXXXXX")"
trap 'rm -f "$archive"; rm -rf "$staging"' EXIT

echo "Downloading the official High-Vive CLI…"
curl -fsSL https://github.com/jhemj/High_Vive/archive/refs/heads/main.tar.gz -o "$archive"
tar -xzf "$archive" -C "$staging"
rm -rf "$SOURCE_ROOT"
mv "$staging/High_Vive-main" "$SOURCE_ROOT"

cd "$SOURCE_ROOT"
pnpm install --frozen-lockfile
pnpm high-vive -- assess --server "$SERVER"
