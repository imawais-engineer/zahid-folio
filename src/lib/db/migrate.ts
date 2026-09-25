// Minimal idempotent SQL migrator.
// Applies every .sql file in src/lib/db/migrations (embedded at build time by
// Vite's import.meta.glob) inside a transaction, in lexicographic order,
// recording applied filenames in schema_migrations.
const migrationFiles = import.meta.glob<string | { default: string }>("./migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

const migrations = Object.entries(migrationFiles)
  // Depending on the build pipeline the glob values are either the raw string
  // itself or a module namespace object with .default — accept both.
  .map(([path, mod]) => ({
    path,
    sql:
      typeof mod === "string"
        ? mod
        : mod && typeof mod === "object" && typeof mod.default === "string"
          ? mod.default
          : String(mod ?? ""),
  }))
  .filter((migration) => migration.sql.length > 0)
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

export async function runMigrations(db: import("postgres").Sql): Promise<void> {
  await db.unsafe(`create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`);

  const applied = new Set<string>(
    (
      (await db.unsafe(`select filename from schema_migrations`)) as Array<{
        filename: string;
      }>
    ).map((row) => row.filename),
  );

  for (const migration of migrations) {
    const filename = migration.path.replace(/^.*\//, "");
    if (applied.has(filename)) continue;
    try {
      await db.begin(async (tx) => {
        await tx.unsafe(migration.sql);
        await tx.unsafe(`insert into schema_migrations (filename) values ($1)`, [filename]);
      });
    } catch (error) {
      throw new Error(`Migration ${filename} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
