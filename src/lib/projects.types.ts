export type ProjectRow = {
  id: string;
  slug: string | null;
  title: string;
  short: string;
  platforms: string[];
  capabilities: string[];
  industries: string[];
  tags: string[];
  access: string;
  thumbnail_url: string | null;
  screenshots: string[];
  model_url: string | null;
  challenge: string;
  approach: string;
  value: string;
  priority: number;
  featured: boolean;
  is_template: boolean;
  public_enabled: boolean;
  created_at: string;
  updated_at: string;
  revision: number;
};

const OPTIONAL_STRING_COLUMNS = ["slug", "thumbnail_url", "model_url"] as const;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asRow(value: Record<string, unknown>): ProjectRow {
  const row = { ...value } as Record<string, unknown>;
  for (const column of OPTIONAL_STRING_COLUMNS) {
    if (row[column] === undefined) row[column] = null;
  }
  return row as unknown as ProjectRow;
}

export function normalizeProjectRow(value: unknown): ProjectRow {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid project row returned from database");
  }
  return asRow(value as Record<string, unknown>);
}

export function normalizeProjectRows(value: unknown): ProjectRow[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeProjectRow);
}

export type Project = ProjectRow;
export type ProjectDraft = Omit<Project, "id" | "created_at" | "updated_at" | "revision"> & {
  id?: string;
  updated_at?: string;
  revision?: number;
};
