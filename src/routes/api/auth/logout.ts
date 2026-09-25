import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE_NAME, sessionCookieOptions, logout } from "@/lib/auth";

// POST /api/auth/logout — deletes the server session and clears the cookie.
export const Route = createFileRoute("/api/auth/logout")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async () => {
        const token = getCookie(SESSION_COOKIE_NAME);
        await logout(token);
        deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
        return Response.json({ ok: true });
      },
    },
  },
});
