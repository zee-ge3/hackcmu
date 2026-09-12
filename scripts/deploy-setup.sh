#!/usr/bin/env bash
# One-shot deployment setup for this machine:
#   scripts/deploy-setup.sh                 # tunnel ingress + service, prints the OAuth to-do
#   scripts/deploy-setup.sh <GOOGLE_CLIENT_ID>   # ...and stores the client ID, restarts the app
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=pairwise.georgez.xyz
PORT=$(grep -E '^PORT=' .env | cut -d= -f2)
CF=/etc/cloudflared/config.yml

echo "== cloudflared ingress ($HOST -> localhost:$PORT)"
if sudo grep -q "hostname: $HOST" "$CF"; then
  echo "   already present"
else
  sudo cp "$CF" "$CF.bak.$(date +%s)"
  sudo sed -i "/^  - service: http_status:404/i\\  - hostname: $HOST\n    service: http://localhost:$PORT" "$CF"
  sudo cloudflared --config "$CF" tunnel ingress validate
  sudo systemctl restart cloudflared
  echo "   added and cloudflared restarted"
fi

if [ "${1:-}" != "" ]; then
  echo "== storing GOOGLE_CLIENT_ID"
  sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$1|" .env
fi

echo "== building and restarting pairwise.service"
npm run build --silent >/dev/null
systemctl --user restart pairwise.service
sleep 2
systemctl --user is-active pairwise.service
curl -s "http://127.0.0.1:$PORT/api/me"; echo
curl -s -o /dev/null -w "https://$HOST -> HTTP %{http_code}\n" "https://$HOST/api/catalog" || true

if grep -q '^GOOGLE_CLIENT_ID=$' .env; then
  cat <<MSG

== ONE MANUAL STEP LEFT (Google has no CLI for this):
   1. Open https://console.cloud.google.com/apis/credentials (sign in as gzhou6933@gmail.com)
   2. Create credentials -> OAuth client ID -> Web application
   3. Authorized JavaScript origins:  http://localhost:$PORT   and   https://$HOST
   4. Copy the client ID and run:   scripts/deploy-setup.sh <paste-client-id>
MSG
else
  echo "== done: open https://$HOST, sign in with Google, add your OpenAI key on /profile"
fi
