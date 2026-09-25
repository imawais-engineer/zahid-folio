import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminFromRequest } from "@/lib/admin-guard";
import {
  insertProject,
  updateProject,
  deleteProject,
  getProject,
  listProjects,
} from "@/lib/db/projects";

// Admin project CRUD API. Every handler re-checks authorization server-side;
// the client-side gate is purely cosmetic.

function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

const projectPayloadSchema = z.object({
  slug: z.string().max(200).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  short: z.string().max(300).default(""),
  platforms: z.array(z.string().max(100)).max(30).default([]),
  capabilities: z.array(z.string().max(100)).max(30).default([]),
  industries: z.array(z.string().max(100)).max(30).default([]),
  tags: z.array(z.string().max(100)).max(40).default([]),
  access: z.enum(["interactive", "preview", "request"]).default("interactive"),
  thumbnail_url: z.string().max(400).nullable().optional(),
  screenshots: z.array(z.string().max(400)).max(30).default([]),
  model_url: z.string().max(400).nullable().optional(),
  challenge: z.string().max(8000).default(""),
  approach: z.string().max(8000).default(""),
  value: z.string().max(8000).default(""),
  priority: z.number().int().min(-100000).max(100000).default(0),
  featured: z.boolean().default(false),
  is_template: z.boolean().default(false),
  public_enabled: z.boolean().default(true),
});

type ProjectPayload = z.infer<typeof projectPayloadSchema>;

function normalizePayload(payload: ProjectPayload) {
  return {
    ...payload,
    slug: payload.slug?.trim() ? payload.slug.trim() : null,
    thumbnail_url: payload.thumbnail_url || null,
    model_url: payload.model_url?.trim() ? payload.model_url.trim() : null,
  };
}

export const Route = createFileRoute("/api/admin/projects")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        if (!(await requireAdminFromRequest())) return forbidden();
        return Response.json({ projects: await listProjects() });
      },

      POST: async ({ request }) => {
        if (!(await requireAdminFromRequest())) return forbidden();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }
        const parsed = projectPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        try {
          const created = await insertProject(normalizePayload(parsed.data));
          return Response.json({ project: created }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const conflict = message.includes("projects_slug_key") || message.includes("duplicate key");
          return Response.json(
            {
              error: conflict
                ? "That slug is already used by another project — choose a different one."
                : "Save failed",
            },
            { status: conflict ? 409 : 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        if (!(await requireAdminFromRequest())) return forbidden();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }
        const schema = projectPayloadSchema.extend({
          id: z.string().uuid(),
          revision: z.number().int().positive().optional(),
        });
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const { id, revision, ...payload } = parsed.data;
        try {
          const updated = await updateProject(id, normalizePayload(payload), revision);
          if (!updated) {
            // Distinguish "row changed since read" from "row missing".
            const existing = await getProject(id);
            if (!existing) return Response.json({ error: "Project not found" }, { status: 404 });
            return Response.json({ conflict: true }, { status: 409 });
          }
          return Response.json({ project: updated });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const conflict = message.includes("projects_slug_key") || message.includes("duplicate key");
          return Response.json(
            {
              error: conflict
                ? "That slug is already used by another project — choose a different one."
                : "Save failed",
            },
            { status: conflict ? 409 : 500 },
          );
        }
      },

      DELETE: async ({ request }) => {
        if (!(await requireAdminFromRequest())) return forbidden();
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        if (!z.string().uuid().safeParse(id).success) {
          return Response.json({ error: "Invalid project id" }, { status: 400 });
        }
        const deleted = await deleteProject(id);
        if (!deleted) return Response.json({ error: "Project not found" }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
