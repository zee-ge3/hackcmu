#!/usr/bin/env bash
# Deploys this checkout to the local pairwise.service.
#
#   scripts/deploy.sh          sync (what the timer and the webhook run): fetch
#                              origin/main, fast-forward when it moved, and if
#                              the checked-out commit differs from the one last
#                              deployed: install deps if needed, run the unit
#                              tests, build, restart
#   scripts/deploy.sh --here   deploy the current checkout as it is, including
#                              uncommitted edits; no fetch
#   scripts/deploy.sh --force  sync, then rebuild even when nothing changed
#
# Local work is safe: a dirty tree makes the sync stop and say so; commits
# made on this box deploy (and the sync says origin is behind until they are
# pushed); a divergence from origin/main is reported, never resolved here.
set -euo pipefail
cd "$(dirname "$0")/.."
mode=${1:-sync}
log() { echo "[deploy $(date +%H:%M:%S)] $*"; }
# A skip reason is printed once, not every minute the situation persists.
skip() {
  if [ "$(cat .deploy.state 2>/dev/null)" != "$1" ]; then
    log "$1"
    echo "$1" >.deploy.state
  fi
  exit 0
}
clear_state() { rm -f .deploy.state; }

exec 9>.deploy.lock
if ! flock -n 9; then
  log "another deploy is running; skipping"
  exit 0
fi

branch=main
before=$(git rev-parse HEAD)
lock_before=$(git rev-parse "HEAD:package-lock.json")

if [ "$mode" != "--here" ]; then
  current=$(git rev-parse --abbrev-ref HEAD)
  [ "$current" = "$branch" ] ||
    skip "checked out '$current', not $branch; nothing deployed (use --here to deploy it)"
  [ -z "$(git status --porcelain --untracked-files=no)" ] ||
    skip "working tree has uncommitted changes; not deploying (commit them, or run: npm run deploy)"
  git fetch -q origin "$branch"
  remote=$(git rev-parse "origin/$branch")
  if [ "$before" != "$remote" ]; then
    if git merge-base --is-ancestor "$before" "$remote"; then
      git merge -q --ff-only "origin/$branch"
      log "updated $(git rev-parse --short "$before") -> $(git rev-parse --short HEAD) from origin/$branch"
    elif git merge-base --is-ancestor "$remote" "$before"; then
      log "local $branch is ahead of origin/$branch; deploying local commits (push them when ready)"
    else
      skip "local $branch and origin/$branch have diverged; not deploying (pull --rebase or push, then it resumes)"
    fi
  fi
  clear_state
  deployed=$(cat .deployed 2>/dev/null || true)
  if [ "$(git rev-parse HEAD)" = "$deployed" ] && [ "$mode" != "--force" ]; then
    exit 0
  fi
fi

lock_after=$(git rev-parse "HEAD:package-lock.json" 2>/dev/null || echo changed)
if [ "$lock_before" != "$lock_after" ] || [ ! -d node_modules ]; then
  log "package-lock.json changed; installing dependencies"
  npm ci --no-audit --no-fund --silent
fi

log "running unit tests"
if ! npm test --silent >.deploy-test.log 2>&1; then
  tail -40 .deploy-test.log
  log "unit tests failed; not deploying $(git rev-parse --short HEAD)"
  exit 1
fi

log "building"
rm -rf dist-next
npx vite build --outDir dist-next --logLevel error
rm -rf dist
mv dist-next dist

systemctl --user restart pairwise.service
sleep 2
if systemctl --user is-active --quiet pairwise.service; then
  git rev-parse HEAD >.deployed
  log "deployed $(git rev-parse --short HEAD)$([ "$mode" = "--here" ] && [ -n "$(git status --porcelain --untracked-files=no)" ] && echo ' (with uncommitted edits)') and restarted pairwise.service"
else
  log "pairwise.service is not active after restart; check: journalctl --user -u pairwise -n 50"
  exit 1
fi
