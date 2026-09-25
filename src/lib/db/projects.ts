import { sql, ensureDatabaseReady } from "./client";
import {
  normalizeProjectRow,
  normalizeProjectRows,
  type Project,
  type ProjectDraft,
} from "../projects.types";

// Server-side data access for projects (replaces all Supabase queries).
// Every entry point ensures migrations have run before the first statement.

export async function listProjects(): Promise<Project[]> {
  await ensureDatabaseReady();
  const rows = await sql`select * from public.projects order by priority desc`;
  return normalizeProjectRows(rows);
}

export async function listPublicProjects(): Promise<Project[]> {
  await ensureDatabaseReady();
  const rows =
    await sql`select * from public.projects where public_enabled = true order by priority desc`;
  return normalizeProjectRows(rows);
}

export async function getPublicProjectBySlug(slug: string): Promise<Project | null> {
  await ensureDatabaseReady();
  const rows =
    await sql`select * from public.projects where slug = ${slug} and public_enabled = true limit 1`;
  const row = rows[0];
  return row ? normalizeProjectRow(row) : null;
}

export async function getProject(id: string): Promise<Project | null> {
  await ensureDatabaseReady();
  const rows = await sql`select * from public.projects where id = ${id} limit 1`;
  const row = rows[0];
  return row ? normalizeProjectRow(row) : null;
}

export async function listProjectSlugs(): Promise<Array<{ id: string; slug: string }>> {
  await ensureDatabaseReady();
  const rows =
    await sql`select id, slug from public.projects where public_enabled = true and slug is not null order by id`;
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row["id"]),
    slug: String(row["slug"]),
  }));
}

type WritePayload = Omit<ProjectDraft, "id" | "updated_at">;

export async function insertProject(payload: WritePayload): Promise<Project> {
  await ensureDatabaseReady();
  const rows = await sql`
    insert into public.projects
      (title, short, slug, platforms, capabilities, industries, tags, access,
       thumbnail_url, screenshots, model_url, challenge, approach, value,
       priority, featured, is_template, public_enabled)
    values
      (${payload.title}, ${payload.short}, ${payload.slug}, ${payload.platforms},
       ${payload.capabilities}, ${payload.industries}, ${payload.tags}, ${payload.access},
       ${payload.thumbnail_url}, ${payload.screenshots}, ${payload.model_url},
       ${payload.challenge}, ${payload.approach}, ${payload.value},
       ${payload.priority}, ${payload.featured}, ${payload.is_template}, ${payload.public_enabled})
    returning *`;
  return normalizeProjectRow(rows[0]);
}

export async function updateProject(
  id: string,
  payload: WritePayload,
  expectedRevision: number | undefined,
): Promise<Project | null> {
  await ensureDatabaseReady();
  // Optimistic concurrency: when expectedRevision is provided, only update if
  // the row has not changed since it was read (mirrors the old CMS check that
  // compared updated_at, but uses an integer revision so precision never
  // causes false conflicts between Postgres microseconds and JS milliseconds).
  if (typeof expectedRevision === "number") {
    const rows = await sql`
      update public.projects set
        title = ${payload.title}, short = ${payload.short}, slug = ${payload.slug},
        platforms = ${payload.platforms}, capabilities = ${payload.capabilities},
        industries = ${payload.industries}, tags = ${payload.tags}, access = ${payload.access},
        thumbnail_url = ${payload.thumbnail_url}, screenshots = ${payload.screenshots},
        model_url = ${payload.model_url}, challenge = ${payload.challenge},
        approach = ${payload.approach}, value = ${payload.value},
        priority = ${payload.priority}, featured = ${payload.featured},
        is_template = ${payload.is_template}, public_enabled = ${payload.public_enabled}
      where id = ${id} and revision = ${expectedRevision}
      returning *`;
    const row = rows[0];
    return row ? normalizeProjectRow(row) : null;
  }
  const rows = await sql`
    update public.projects set
      title = ${payload.title}, short = ${payload.short}, slug = ${payload.slug},
      platforms = ${payload.platforms}, capabilities = ${payload.capabilities},
      industries = ${payload.industries}, tags = ${payload.tags}, access = ${payload.access},
      thumbnail_url = ${payload.thumbnail_url}, screenshots = ${payload.screenshots},
      model_url = ${payload.model_url}, challenge = ${payload.challenge},
      approach = ${payload.approach}, value = ${payload.value},
      priority = ${payload.priority}, featured = ${payload.featured},
      is_template = ${payload.is_template}, public_enabled = ${payload.public_enabled}
    where id = ${id}
    returning *`;
  const row = rows[0];
  return row ? normalizeProjectRow(row) : null;
}

export async function updateProjectPriority(
  id: string,
  priority: number,
): Promise<Pick<Project, "id" | "priority" | "updated_at"> | null> {
  await ensureDatabaseReady();
  const rows = await sql`
    update public.projects set priority = ${priority} where id = ${id}
    returning id, priority, updated_at`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row
    ? {
        id: String(row["id"]),
        priority: Number(row["priority"]),
        updated_at: new Date(row["updated_at"] as string).toISOString(),
      }
    : null;
}

export async function setProjectPublicEnabled(
  id: string,
  publicEnabled: boolean,
  expectedRevision: number | undefined,
): Promise<Project | null> {
  await ensureDatabaseReady();
  if (typeof expectedRevision === "number") {
    const rows = await sql`
      update public.projects set public_enabled = ${publicEnabled}
      where id = ${id} and revision = ${expectedRevision}
      returning *`;
    const row = rows[0];
    return row ? normalizeProjectRow(row) : null;
  }
  const rows = await sql`
    update public.projects set public_enabled = ${publicEnabled}
    where id = ${id}
    returning *`;
  const row = rows[0];
  return row ? normalizeProjectRow(row) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensureDatabaseReady();
  const rows = await sql`delete from public.projects where id = ${id} returning id`;
  return rows.length > 0;
}
