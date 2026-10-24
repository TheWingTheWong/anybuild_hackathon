#!/usr/bin/env bash
# Usage: scripts/worktree.sh <lane>     lanes: a1 a2 b1 b2 (see plan.md)
#        scripts/worktree.sh rm <lane>  remove a lane's worktree after it is merged
# Creates ../<repo>-<lane> on branch lane/<lane>, with its own .env ports and node_modules.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
if [[ "${1:-}" == "rm" ]]; then
  git -C "$root" worktree remove "$root/../$(basename "$root")-$2" && git -C "$root" branch -d "lane/$2"
  exit 0
fi
lane="${1:?lane required: a1 a2 b1 b2}"
case "$lane" in
  a1) web=5174 api=8788 ;;
  a2) web=5175 api=8789 ;;
  b1) web=5176 api=8790 ;;
  b2) web=5177 api=8791 ;;
  *) echo "unknown lane $lane"; exit 1 ;;
esac
dir="$root/../$(basename "$root")-$lane"
git -C "$root" fetch -q origin 2>/dev/null || true
base="$(git -C "$root" rev-parse --verify -q origin/main >/dev/null && echo origin/main || echo main)"
git -C "$root" worktree add -b "lane/$lane" "$dir" "$base"
{ [[ -f "$root/.env" ]] && grep -v '_PORT=' "$root/.env" || true; echo "WEB_PORT=$web"; echo "API_PORT=$api"; } > "$dir/.env"
(cd "$dir" && pnpm install --frozen-lockfile --prefer-offline >/dev/null)
echo "ready: cd $dir && pnpm dev   ->  http://localhost:$web"
echo "then start your agent there:  claude \"Read plan.md and AGENTS.md. You own lane $lane.\""
