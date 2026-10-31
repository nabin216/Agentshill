#!/usr/bin/env bash
# Pulls latest main, rebuilds frontend, restarts backend. Run by GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")"
git fetch origin main
git reset --hard origin/main
"$HOME/.local/bin/uv" pip install -q --python .venv/bin/python -r requirements.txt
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
cd dashboard/frontend
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
npm run build
sudo rsync -a --delete dist/ /var/www/agentshield/
sudo systemctl restart agentshield-backend
sleep 2
systemctl is-active agentshield-backend
echo "Deployed $(git rev-parse --short HEAD)"
