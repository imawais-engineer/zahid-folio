import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth";

// GET /api/auth/session — current signed-in user (null when signed out).
export const Route = createFileRoute("/api/auth/session")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const token = getCookie(SESSION_COOKIE_NAME);
        const auth = await validateSession(token);
        if (!auth) return Response.json({ user: null });
        return Response.json({
          user: {
            id: auth.user.id,
            email: auth.user.email,
            isAdmin: auth.user.roles.includes("admin"),
          },
        });
      },
    },
  },
});
