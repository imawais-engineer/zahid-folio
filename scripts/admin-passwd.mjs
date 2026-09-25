#!/usr/bin/env node
// Interactive admin password set/reset for the self-hosted portfolio.
//
// Usage (on the VPS, from /opt/zahid-folio):
//   docker compose exec portfolio node scripts/admin-passwd.mjs
//   npm run admin:passwd            (local/dev, needs DATABASE_URL or POSTGRES_* env)
//
// Reads the password interactively from the terminal; never accepts it via
// argv or env so it can't leak into shell history, logs, or `ps` output.
// The password is stored only as a bcrypt hash (cost 12).

import { createInterface } from "node:readline/promises";
import { stdin, stdout, env, exit } from "node:process";
import { readdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import bcrypt from "bcrypt";

const BCRYPT_COST = 12;
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
    console.error(
      "Database connection not configured. Set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB (+ optional POSTGRES_HOST/POSTGRES_PORT).",
    );
    exit(1);
  }
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

// Apply pending migrations first so users/sessions tables exist.
async function runMigrations(db) {
  const migrationsDir = path.join(SCRIPT_DIR, "..", "src", "lib", "db", "migrations");
  let files;
  try {
    files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    console.error("Could not read migrations directory. Run this script from the repository.");
    exit(1);
  }
  await db.unsafe(`create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set(
    (await db.unsafe(`select filename from schema_migrations`)).map((r) => r.filename),
  );
  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sqlText = await readFile(path.join(migrationsDir, filename), "utf8");
    await db.begin(async (tx) => {
      await tx.unsafe(sqlText);
      await tx.unsafe(`insert into schema_migrations (filename) values ($1)`, [filename]);
    });
    console.log(`applied migration: ${filename}`);
  }
}

// ---- input helpers -------------------------------------------------------
// Interactive TTY: passwords are read with echo disabled. Piped input
// (docker compose exec -T ... < file / printf pipe): all lines are consumed
// up front from a queue so successive prompts cannot hang or lose data.
let pipedLines = null;
let pipedIdx = 0;

function isPiped() {
  return !stdin.isTTY;
}

function nextPipedLine(mask) {
  if (pipedLines === null) {
    pipedLines = readFileSync(0, "utf8").split(/\r?\n/);
    while (pipedLines.length && pipedLines[pipedLines.length - 1] === "") pipedLines.pop();
    pipedIdx = 0;
  }
  const line = pipedIdx < pipedLines.length ? pipedLines[pipedIdx++] : "";
  stdout.write(mask ? "********\n" : `${line}\n`);
  return line;
}

async function promptLine(question, mask = false) {
  stdout.write(question);
  if (isPiped()) return nextPipedLine(mask);
  const rl = createInterface({ input: stdin, output: stdout });
  const value = await rl.question("");
  rl.close();
  return value;
}

async function promptHidden(question) {
  // Mute terminal echo while typing the password; never accepts the password
  // via argv or env so it can't leak into shell history, logs or `ps` output.
  stdout.write(question);
  if (isPiped()) return nextPipedLine(true);
  const wasRaw = stdin.isRaw ?? false;
  stdin.setRawMode(true);
  let value = "";
  await new Promise((resolve) => {
    const onData = (chunk) => {
      const input = chunk.toString();
      if (input === "\r" || input === "\n") {
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve();
        return;
      }
      if (input === "\u0003") {
        // Ctrl+C
        stdout.write("\n");
        exit(130);
      }
      if (input === "\u007f" || input === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += input;
    };
    stdin.on("data", onData);
  });
  stdin.setRawMode(wasRaw);
  return value;
}

async function main() {
  const sql = postgres(resolveDatabaseUrl(), { max: 1, onnotice: () => {} });
  try {
    await runMigrations(sql);

    const adminRows = await sql`
      select u.id, u.email from public.users u
      join public.user_roles r on r.user_id = u.id
      where r.role = 'admin'
      order by u.email`;
    const envEmail = env["ADMIN_EMAIL"]?.trim().toLowerCase();

    let targetEmail;
    if (adminRows.length === 0) {
      targetEmail = envEmail;
      if (!targetEmail) {
        targetEmail = (await promptLine("Admin email: ")).trim().toLowerCase();
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        console.error("A valid admin email is required.");
        exit(1);
      }
      console.log(`No admin exists yet. A new admin account will be created for: ${targetEmail}`);
    } else {
      console.log("Existing admin accounts:");
      for (const row of adminRows) console.log(`  - ${row.email}`);
      const defaultEmail = envEmail && adminRows.some((r) => r.email === envEmail) ? envEmail : adminRows[0].email;
      const answer = (await promptLine(`Target email [${defaultEmail}]: `)).trim().toLowerCase();
      targetEmail = answer || defaultEmail;
    }

    const password = await promptHidden("New password (input hidden): ");
    if (password.length < 8) {
      console.error("Password must be at least 8 characters.");
      exit(1);
    }
    const confirm = await promptHidden("Confirm password (input hidden): ");
    if (password !== confirm) {
      console.error("Passwords do not match.");
      exit(1);
    }

    const hash = await bcrypt.hash(password, BCRYPT_COST);

    await sql.begin(async (tx) => {
      const existing = await tx`
        select id from public.users where email = ${targetEmail} limit 1`;
      let userId;
      if (existing.length > 0) {
        userId = existing[0].id;
        await tx`update public.users set password_hash = ${hash}, updated_at = now() where id = ${userId}`;
      } else {
        const inserted = await tx`
          insert into public.users (email, password_hash) values (${targetEmail}, ${hash})
          returning id`;
        userId = inserted[0].id;
      }
      await tx`
        insert into public.user_roles (user_id, role) values (${userId}, 'admin')
        on conflict (user_id, role) do nothing`;
      // Invalidate any existing sessions for this user after a password change.
      await tx`delete from public.sessions where user_id = ${userId}`;
    });

    console.log(`Done. Admin credentials updated for ${targetEmail}. All previous sessions were revoked.`);
    console.log("Sign in at https://alphainsights.consulting/admin");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("admin-passwd failed:", error instanceof Error ? error.message : error);
  exit(1);
});
