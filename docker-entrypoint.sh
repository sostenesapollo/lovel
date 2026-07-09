#!/bin/sh
set -eu

mkdir -p /app/data
export DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}"

/usr/bin/node ./node_modules/prisma/build/index.js db push
/usr/bin/node --import tsx ./prisma/seed.ts 2>/dev/null || true
exec /usr/bin/node server.js
