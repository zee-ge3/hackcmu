#!/usr/bin/env bash
# Deploys this checkout to the local pairwise.service.
#
#   scripts/deploy.sh          sync: fast-forward main to origin/main and, if it
#                              moved, install deps if needed, run the unit tests,
#                              build, and restart (what the timer and webhook run)
#   scripts/deploy.sh --here   deploy the current checkout as it is (local
#                              commits, or uncommitted edits), no fetch
#   scripts/deploy.sh --force  like sync but rebuilds even when nothing changed
#
# The sync mode never touches local work: a dirty tree or unpushed commits on
# main make it stop and say so, so edits made on this box are always safe.
set -euo pipefail
cd "$(dirname "$0")/.."
mode=${1:-sync}
log() { echo "[deploy $(date +%H:%M:%S)] $*"; }

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
  if [ "$current" != "$branch" ]; then
    log "checked out '$current', not $branch; nothing done (use --here to deploy it)"
    exit 0
  fi
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    log "working tree has uncommitted changes; not syncing (commit them, or run --here)"
    exit 0
  fi
  git fetch -q origin "$branch"
  remote=$(git rev-parse "origin/$branch")
  if [ "$before" = "$remote" ] && [ "$mode" != "--force" ]; then
    exit 0
  fi
  if ! git merge-base --is-ancestor "$before" "$remote"; then
    log "local $branch has commits that are not on origin/$branch; push them first (git push origin $branch), or run --here"
    exit 0
  fi
  if [ "$before" != "$remote" ]; then
    git merge -q --ff-only "origin/$branch"
    log "updated $(git rev-parse --short "$before") -> $(git rev-parse --short HEAD)"
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
  log "deployed $(git rev-parse --short HEAD) and restarted pairwise.service"
else
  log "pairwise.service is not active after restart; check: journalctl --user -u pairwise -n 50"
  exit 1
fi
