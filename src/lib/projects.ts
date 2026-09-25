import { queryOptions } from "@tanstack/react-query";
import { normalizeProjectRows, type Project } from "./projects.types";

export type { Project } from "./projects.types";
export type { ProjectDraft } from "./projects.types";

export const accessLabel = (a: string) =>
  a === "interactive" ? "Interactive" : a === "preview" ? "Preview only" : "Available on request";

async function fetchProjectsJson(url: string): Promise<Project[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load projects (${res.status})`);
  const body: unknown = await res.json();
  const rows =
    body && typeof body === "object" && "projects" in body
      ? (body as { projects: unknown }).projects
      : body;
  return normalizeProjectRows(rows);
}

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async (): Promise<Project[]> => {
    // Admin CMS list — server enforces authorization; unauthenticated callers
    // get an empty list (matching the old RLS behaviour of hiding rows).
    const res = await fetch("/api/admin/projects");
    if (res.status === 403 || res.status === 401) return [];
    if (!res.ok) throw new Error(`Could not load projects (${res.status})`);
    const body: unknown = await res.json();
    const rows =
      body && typeof body === "object" && "projects" in body
        ? (body as { projects: unknown }).projects
        : [];
    return normalizeProjectRows(rows);
  },
});

export const publicProjectsQuery = queryOptions({
  queryKey: ["projects", "public"],
  queryFn: () => fetchProjectsJson("/api/public/projects"),
});

export const CFO_PACK_SLUG = "cfo-fp-a-capability-pack";

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function uniqueValues(list: Project[], key: "platforms" | "capabilities" | "industries" | "tags") {
  return Array.from(new Set(list.flatMap((p) => p[key]))).sort((a, b) => a.localeCompare(b));
}
