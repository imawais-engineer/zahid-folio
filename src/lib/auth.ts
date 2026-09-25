import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ensureDatabaseReady, sql } from "./db/client";

// Application-owned authentication against the local PostgreSQL database.
// - Passwords stored only as bcrypt hashes (cost 12)
// - Server-side sessions in the sessions table; opaque random token in an
//   HttpOnly cookie; only the SHA-256 hash of the token is stored server-side
// - Admin role checked server-side on every privileged operation
// - Failed-login rate limiting recorded in the login_attempts table

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_COOKIE = "portfolio_session";
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_MAX = 8;

async function hashPassword(password: string): Promise<string> {
  const { default: bcrypt } = await import("bcrypt");
  return bcrypt.hash(password, BCRYPT_COST);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { default: bcrypt } = await import("bcrypt");
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export type SessionUser = {
  id: string;
  email: string;
  roles: Array<"admin" | "user">;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getClientInfo() {
  return {
    userAgent: globalThis.__portfolioRequestMeta?.userAgent ?? null,
    ip: globalThis.__portfolioRequestMeta?.ip ?? null,
  };
}

declare global {
  // Set per-request by the auth middleware so login/session records can capture
  // user agent + IP without threading them through every server function.
  // eslint-disable-next-line no-var
  var __portfolioRequestMeta: { userAgent?: string | null; ip?: string | null } | undefined;
}

export function setRequestMeta(meta: { userAgent?: string | null; ip?: string | null }) {
  globalThis.__portfolioRequestMeta = meta;
}

export function clearRequestMeta() {
  globalThis.__portfolioRequestMeta = undefined;
}

async function countRecentFailures(email: string, ip: string | null): Promise<number> {
  // interval literals cannot be parameterized; the window is a fixed numeric
  // constant (never user input) so inlining it is safe.
  const windowSeconds = Math.floor(FAILED_LOGIN_WINDOW_MS / 1000);
  const rows = (await sql.unsafe(
    `select count(*)::int as n from public.login_attempts
    where success = false and attempted_at > now() - interval '${windowSeconds} seconds'
      and (email = $1 or ($2::text is not null and ip_address = $2))`,
    [email, ip],
  )) as Array<{ n: number }>;
  return Number(rows[0]?.["n"] ?? 0);
}

async function recordAttempt(email: string, ip: string | null, success: boolean): Promise<void> {
  await sql`
    insert into public.login_attempts (email, ip_address, success)
    values (${email}, ${ip}, ${success})`;
  // Opportunistic cleanup of stale attempt records.
  await sql`
    delete from public.login_attempts where attempted_at < now() - interval '30 days'`;
}

export type LoginResult =
  | { ok: true; token: string; user: SessionUser }
  | { ok: false; error: "rate_limited" | "invalid_credentials" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalized = normalizeEmail(email);
  const { ip } = getClientInfo();

  await ensureDatabaseReady();

  const failures = await countRecentFailures(normalized, ip);
  if (failures >= FAILED_LOGIN_MAX) {
    await recordAttempt(normalized, ip, false);
    return { ok: false, error: "rate_limited" };
  }

  const userRows = await sql`
    select id, email, password_hash from public.users where email = ${normalized} limit 1`;
  const user = userRows[0];

  // Constant dummy hash (of an unguessable random value) so the unknown-email
  // path performs the same bcrypt work as the wrong-password path.
  const dummyHash =
    "$2a$12$X7YqzG1TnQHqGSmUc9aWbOQ0ZLWnSFIhOLQzZbPgTlWqmsnMGwKXK";
  const valid = user
    ? await verifyPassword(password, String(user["password_hash"]))
    : await verifyPassword(password, dummyHash);

  if (!user || !valid) {
    await recordAttempt(normalized, ip, false);
    return { ok: false, error: "invalid_credentials" };
  }

  await recordAttempt(normalized, ip, true);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { userAgent } = getClientInfo();

  await sql`
    insert into public.sessions (token_hash, user_id, expires_at, user_agent, ip_address)
    values (${hashToken(token)}, ${String(user["id"])}, ${expiresAt}, ${userAgent}, ${ip})`;

  // Opportunistic cleanup of expired sessions.
  await sql`delete from public.sessions where expires_at < now()`;

  const roleRows = await sql<{ role: string }[]>`
    select role from public.user_roles where user_id = ${String(user["id"])}`;
  const roles = roleRows.map((row) => String(row["role"]) as "admin" | "user");

  return { ok: true, token, user: { id: String(user["id"]), email: String(user["email"]), roles } };
}

export type AuthContext = { user: SessionUser; sessionId: string } | null;

export async function validateSession(token: string | undefined): Promise<AuthContext> {
  if (!token) return null;
  await ensureDatabaseReady();
  const tokenHash = hashToken(token);
  const rows = await sql`
    select s.id as session_id, s.expires_at, u.id as user_id, u.email
    from public.sessions s
    join public.users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  if (new Date(String(row["expires_at"])).getTime() <= Date.now()) {
    await sql`delete from public.sessions where id = ${String(row["session_id"])}`;
    return null;
  }
  const roleRows = await sql<{ role: string }[]>`select role from public.user_roles where user_id = ${String(row["user_id"])}`;
  const roles = roleRows.map((r) => String(r["role"]) as "admin" | "user");
  return {
    sessionId: String(row["session_id"]),
    user: { id: String(row["user_id"]), email: String(row["email"]), roles },
  };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await ensureDatabaseReady();
  await sql`delete from public.sessions where token_hash = ${hashToken(token)}`;
}

export async function requireAdmin(auth: AuthContext): Promise<SessionUser> {
  if (!auth || !auth.user.roles.includes("admin")) {
    throw new Error("Forbidden: administrator role required");
  }
  return auth.user;
}

// ---- session cookie helpers (used by auth routes) ----

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function sessionCookieOptions(maxAgeSeconds: number) {
  const secure = process.env["COOKIE_SECURE"] !== "false";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

// ---- admin bootstrap (first-run password set / reset) ----
// Interactive CLI: `npm run admin:passwd` (see scripts/admin-passwd.mjs).
// The bootstrap token flow below supports a non-interactive container run:
// the operator generates a token with the same script; the token allows
// setting the password for the configured ADMIN_EMAIL exactly once.

export async function listAdmins(): Promise<Array<{ id: string; email: string }>> {
  await ensureDatabaseReady();
  const rows = await sql<{ id: string; email: string }[]>`
    select u.id, u.email from public.users u
    join public.user_roles r on r.user_id = u.id
    where r.role = 'admin'
    order by u.email`;
  return rows.map((row) => ({ id: String(row["id"]), email: String(row["email"]) }));
}

export async function countAdmins(): Promise<number> {
  await ensureDatabaseReady();
  const rows = await sql<{ n: number }[]>`select count(*)::int as n from public.user_roles where role = 'admin'`;
  return Number(rows[0]?.n ?? 0);
}

export { timingSafeEqual };
