import { createFileRoute } from "@tanstack/react-router";
import { sql, ensureDatabaseReady } from "@/lib/db/client";

// GET /api/health — liveness + database connectivity check.
export const Route = createFileRoute("/api/health")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        let database = "down";
        try {
          await ensureDatabaseReady();
          await sql`select 1`;
          database = "up";
        } catch (error) {
          console.error("[health] database check failed:", error);
        }
        return Response.json(
          { status: "ok", database },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
