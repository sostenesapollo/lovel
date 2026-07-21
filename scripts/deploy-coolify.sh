#!/usr/bin/env bash
# Bootstrap: carrega deploy-coolify.sh do repo cursor-skills (local ou GitHub via gh).
# Config do app fica só no package.json → "coolify".
set -euo pipefail
cd "$(dirname "$0")/.."

CS_REPO="sostenesapollo/cursor-skills"
CS_REF="${CURSOR_SKILLS_REF:-main}"
SCRIPT_REL="fish/scripts/deploy-coolify.sh"

run_local() {
  local root="$1"
  [ -n "$root" ] || return 1
  local script="$root/$SCRIPT_REL"
  [ -f "$script" ] || return 1
  exec bash "$script" "$@"
}

for root in "${CURSOR_SKILLS_ROOT:-}" "$HOME/dev/cursor-skills"; do
  run_local "$root" "$@" && exit 0
done

resolve_gh_token() {
  [ -n "${GH_TOKEN:-}" ] && { echo "$GH_TOKEN"; return; }
  [ -n "${GH_TOKEN_PERSONAL:-}" ] && { echo "$GH_TOKEN_PERSONAL"; return; }
  local f="$HOME/.config/gh/tokens/sostenesapollo"
  if [ -f "$f" ]; then tr -d '[:space:]' <"$f"; return; fi
  command -v gh >/dev/null && gh auth token 2>/dev/null || true
}

if ! command -v gh >/dev/null; then
  echo "❌ cursor-skills não encontrado e gh não instalado." >&2
  echo "   Clone ~/dev/cursor-skills ou: brew install gh + PAT em ~/.config/gh/tokens/sostenesapollo" >&2
  exit 1
fi

token="$(resolve_gh_token)"
if [ -z "$token" ]; then
  echo "❌ Sem token GitHub para baixar de $CS_REPO." >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
GH_TOKEN="$token" gh raw "$CS_REPO" "$CS_REF/$SCRIPT_REL" >"$tmpdir/deploy-coolify.sh"
exec bash "$tmpdir/deploy-coolify.sh" "$@"
