#!/usr/bin/env bash
# build.sh — Construction propre du livrable .xpi pour Magic Links
# MTF Karukera
set -e

VERSION=$(node -p "require('./manifest.json').version")
NAME="magic_links"
DIST="dist"

echo "🔨 Construction de ${NAME}-${VERSION}.xpi …"

# Build via web-ext en chargeant la configuration d'exclusion
npx web-ext build --config web-ext-config.cjs --filename "${NAME}-${VERSION}.xpi" --overwrite-dest

echo "✅ dist/${NAME}-${VERSION}.xpi prêt ($(du -h "dist/${NAME}-${VERSION}.xpi" | cut -f1))"
