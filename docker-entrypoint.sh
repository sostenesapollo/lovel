#!/bin/sh
set -eu

mkdir -p /app/data
export DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}"

/usr/bin/node ./node_modules/prisma/build/index.js db push

# Contas antigas (pré-passwordSetAt) já tinham senha utilizável — marca como definidas.
# Contas guest novas continuam com passwordSetAt NULL.
DB_FILE="${DATABASE_URL#file:}"
if [ -f "$DB_FILE" ]; then
  /usr/bin/node -e "
const Database = require('better-sqlite3');
const db = new Database(process.argv[1]);
try {
  db.exec(\"UPDATE User SET passwordSetAt = createdAt WHERE passwordSetAt IS NULL AND (id NOT IN (SELECT DISTINCT userId FROM PasswordResetToken) OR id IN (SELECT DISTINCT userId FROM PasswordResetToken WHERE usedAt IS NOT NULL))\");
} catch (e) { console.warn('[entrypoint] passwordSetAt backfill:', e.message); }
db.close();
" "$DB_FILE" || true
fi

/usr/bin/node --import tsx ./prisma/seed.ts || true
exec /usr/bin/node server.js
