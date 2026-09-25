import { createFileRoute } from "@tanstack/react-router";
import { listPublicProjects } from "@/lib/db/projects";

// GET /api/public/projects — public site data (public_enabled rows only).
export const Route = createFileRoute("/api/public/projects")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const projects = await listPublicProjects();
        return Response.json(projects, {
          headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
        });
      },
    },
  },
});
