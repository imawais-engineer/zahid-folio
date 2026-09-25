import postgres from "postgres";
import { runMigrations } from "./migrate";

// Runtime database client for the self-hosted PostgreSQL instance.
// Connection can be provided either as DATABASE_URL or assembled from
// POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / POSTGRES_HOST / POSTGRES_PORT
// (the same variables the db compose service consumes).
function resolveDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (url) return url;

  const user = process.env["POSTGRES_USER"];
  const password = process.env["POSTGRES_PASSWORD"];
  const database = process.env["POSTGRES_DB"];
  const host = process.env["POSTGRES_HOST"] ?? "127.0.0.1";
  const port = process.env["POSTGRES_PORT"] ?? "5432";

  if (!user || !password || !database) {
    const missing = [
      ...(!user ? ["POSTGRES_USER"] : []),
      ...(!password ? ["POSTGRES_PASSWORD"] : []),
      ...(!database ? ["POSTGRES_DB"] : []),
    ];
    throw new Error(`Missing database environment variable(s): ${missing.join(", ")}`);
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __portfolioSql: postgres.Sql | undefined;
}

function createSql(): postgres.Sql {
  const url = resolveDatabaseUrl();
  return postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });
}

function getSql(): postgres.Sql {
  if (!globalThis.__portfolioSql) {
    globalThis.__portfolioSql = createSql();
  }
  return globalThis.__portfolioSql;
}

// Lazy callable proxy: supports both tagged-template calls (sql`...`) and
// property access (sql.unsafe / sql.begin / sql.end) without connecting until
// the first use. The Proxy target must be a function so sql`...` works.
const sqlTarget = function sqlForward(...args: unknown[]) {
  const client = getSql() as unknown as (...a: unknown[]) => unknown;
  return client(...args);
} as unknown as postgres.Sql;

export const sql = new Proxy(sqlTarget, {
  get(_, prop) {
    const client = getSql() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
  apply(_target, _thisArg, args) {
    const client = getSql() as unknown as (...a: unknown[]) => unknown;
    return client(...(args as unknown[]));
  },
});

let migrationPromise: Promise<void> | undefined;

// Idempotent: migrations run once per server process before the first query.
export async function ensureDatabaseReady(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigrations(getSql()).catch((error) => {
      migrationPromise = undefined;
      throw error;
    });
  }
  await migrationPromise;
}

export async function closeDatabase(): Promise<void> {
  const client = globalThis.__portfolioSql;
  if (client) {
    globalThis.__portfolioSql = undefined;
    await client.end({ timeout: 5 });
  }
}
