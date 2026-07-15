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

// Product.subcategories (Json) — coluna nova; linhas antigas podem ficar com '' e o Prisma quebra no parse
try {
  const cols = db.prepare(\"PRAGMA table_info(Product)\").all().map((c) => c.name);
  if (cols.includes('subcategories')) {
    const rows = db.prepare('SELECT id, subcategory, subcategories FROM Product').all();
    const upd = db.prepare('UPDATE Product SET subcategories = ? WHERE id = ?');
    for (const row of rows) {
      let list = [];
      try {
        const raw = row.subcategories;
        const text = raw == null ? '' : (Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)).trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) list = parsed.map(String).map((s) => s.trim()).filter(Boolean);
        }
      } catch { /* invalid JSON */ }
      if (!list.length) {
        const single = String(row.subcategory || '').trim();
        if (single) list = [single];
      }
      upd.run(JSON.stringify(list), row.id);
    }
    console.log('[entrypoint] subcategories normalized:', rows.length, 'products');
  }
} catch (e) { console.warn('[entrypoint] subcategories backfill:', e.message); }

db.close();
" "$DB_FILE" || true
fi

/usr/bin/node --import tsx ./prisma/seed.ts || true
exec /usr/bin/node server.js
