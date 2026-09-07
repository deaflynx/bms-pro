#!/usr/bin/env bash
# Builds the production site and publishes it to the hosting.
#   npm run deploy
# Connection settings come from deploy/.env (gitignored) or the environment:
#   DEPLOY_HOST=user@host
#   DEPLOY_DOCROOT=/home/user/web/bms-pro.com.ua/public_html
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f deploy/.env ] && . deploy/.env
: "${DEPLOY_HOST:?set DEPLOY_HOST (user@host) or create deploy/.env}"
: "${DEPLOY_DOCROOT:?set DEPLOY_DOCROOT or create deploy/.env}"

SITE_URL=https://bms-pro.com.ua BASE_PATH=/ npm run build
cp deploy/nginx-redirects.conf dist/redirects.conf

# mockups are a design artefact for the GitHub Pages preview, not the live site
rsync -rltpz --delete --chmod=D755,F644 --exclude /mockups dist/ "$DEPLOY_HOST:$DEPLOY_DOCROOT/"
echo "Deployed to https://bms-pro.com.ua/ — purge the Cloudflare cache to see it."
