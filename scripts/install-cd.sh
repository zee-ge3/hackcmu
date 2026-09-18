#!/usr/bin/env bash
# Installs continuous deployment on this machine (no sudo): a user systemd
# timer that runs scripts/deploy.sh every minute, plus the one-shot
# service that the GitHub webhook and the timer both start.
#
#   scripts/install-cd.sh
#
# Afterwards, for instant deploys, add a webhook in GitHub (Settings ->
# Webhooks): URL https://pairwise.georgez.xyz/hooks/github, content type
# application/json, secret = DEPLOY_WEBHOOK_SECRET from .env, event "push".
set -euo pipefail
cd "$(dirname "$0")/.."
repo=$(pwd)
units=~/.config/systemd/user
mkdir -p "$units"

cat >"$units/pairwise-deploy.service" <<EOF
[Unit]
Description=Deploy pairwise from origin/main (scripts/deploy.sh)
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$repo
ExecStart=$repo/scripts/deploy.sh
TimeoutStartSec=15min
EOF

cat >"$units/pairwise-deploy.timer" <<EOF
[Unit]
Description=Poll origin/main and deploy pairwise when it moves

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
AccuracySec=20s

[Install]
WantedBy=timers.target
EOF

if ! grep -q '^DEPLOY_WEBHOOK_SECRET=.\+' .env 2>/dev/null; then
  secret=$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')
  if grep -q '^DEPLOY_WEBHOOK_SECRET=' .env 2>/dev/null; then
    sed -i "s|^DEPLOY_WEBHOOK_SECRET=.*|DEPLOY_WEBHOOK_SECRET=$secret|" .env
  else
    echo "DEPLOY_WEBHOOK_SECRET=$secret" >>.env
  fi
  echo "== generated DEPLOY_WEBHOOK_SECRET in .env (restart pairwise.service to load it)"
fi

chmod +x scripts/deploy.sh
systemctl --user daemon-reload
systemctl --user enable --now pairwise-deploy.timer
echo "== pairwise-deploy.timer enabled:"
systemctl --user list-timers pairwise-deploy.timer --no-pager | head -3
echo "== webhook secret (paste into the GitHub webhook):"
grep '^DEPLOY_WEBHOOK_SECRET=' .env | cut -d= -f2
