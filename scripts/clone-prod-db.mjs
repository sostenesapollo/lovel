#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const localDbPath = join(root, "prod.db");

loadEnvFile(envPath);

if (process.env.CLONE_SKIP === "1" || process.env.SKIP_CLONE_DB === "1") {
  console.log("Clone ignorado (CLONE_SKIP=1). Usando prod.db local.");
  process.exit(0);
}

const sshHost = process.env.CLONE_DB_SSH_HOST ?? "hostinger";
const appUuid = process.env.CLONE_DB_APP_UUID ?? "e94spl9klhnl6o2zofjqd9jj";
const remoteDbPath = process.env.CLONE_DB_REMOTE_PATH ?? "/app/data/prod.db";
const databaseUrl = process.env.CLONE_DB_DATABASE_URL ?? "file:./prod.db";

console.log(`Clonando SQLite de prod (${sshHost})...`);

try {
  const containerId = execSync(
    `ssh ${quote(sshHost)} "docker ps -q --filter name=${appUuid} | head -1"`,
    { encoding: "utf8", timeout: 30_000 },
  ).trim();

  if (!containerId) {
    throw new Error(`Container Coolify não encontrado (uuid: ${appUuid}).`);
  }

  if (existsSync(localDbPath)) {
    const backupPath = `${localDbPath}.bak`;
    copyFileSync(localDbPath, backupPath);
    console.log(`Backup local: ${backupPath}`);
  }

  const dbBytes = execFileSync(
    "ssh",
    [sshHost, `docker exec ${containerId} cat ${remoteDbPath}`],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
  );

  if (
    dbBytes.length < 16 ||
    dbBytes.subarray(0, 15).toString("utf8") !== "SQLite format 3"
  ) {
    throw new Error("Arquivo baixado não é um SQLite válido.");
  }

  writeFileSync(localDbPath, dbBytes);
  console.log(`Salvo: ${localDbPath} (${dbBytes.length} bytes)`);

  updateDatabaseUrl(envPath, databaseUrl);
  console.log(`DATABASE_URL -> ${databaseUrl}`);
  console.log(
    "Se o login falhar, faça logout e entre de novo (sessão antiga do dev.db não vale).",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (existsSync(localDbPath)) {
    console.warn(`Clone falhou (${message}). Usando prod.db existente.`);
    updateDatabaseUrl(envPath, databaseUrl);
    process.exit(0);
  }

  console.error(`Clone falhou: ${message}`);
  console.error("Defina CLONE_SKIP=1 para pular, ou rode: pnpm db:pull");
  process.exit(1);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function updateDatabaseUrl(path, url) {
  const quoted = `"${url}"`;
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";

  if (/^DATABASE_URL=.*$/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${quoted}`);
  } else {
    content = `${content.trimEnd()}\nDATABASE_URL=${quoted}\n`;
  }

  writeFileSync(path, content);
}

function quote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
