#!/usr/bin/env node
// Standalone migration runner (same SQL files the app applies at startup).
//
// Usage:
//   npm run db:migrate            (needs DATABASE_URL or POSTGRES_* env)

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, exit } from "node:process";
import postgres from "postgres";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function resolveDatabaseUrl() {
  const url = env["DATABASE_URL"];
  if (url) return url;
  const user = env["POSTGRES_USER"];
  const password = env["POSTGRES_PASSWORD"];
  const database = env["POSTGRES_DB"];
  const host = env["POSTGRES_HOST"] ?? "127.0.0.1";
  const port = env["POSTGRES_PORT"] ?? "5432";
  if (!user || !password || !database) {
    console.error("Set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB.");
    exit(1);
  }
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const sql = postgres(resolveDatabaseUrl(), { max: 1 });

try {
  const migrationsDir = path.join(SCRIPT_DIR, "..", "src", "lib", "db", "migrations");
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  await sql.unsafe(`create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set(
    (await sql.unsafe(`select filename from schema_migrations`)).map((r) => r.filename),
  );
  let count = 0;
  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sqlText = await readFile(path.join(migrationsDir, filename), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlText);
      await tx.unsafe(`insert into schema_migrations (filename) values ($1)`, [filename]);
    });
    console.log(`applied: ${filename}`);
    count += 1;
  }
  console.log(count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`);
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
