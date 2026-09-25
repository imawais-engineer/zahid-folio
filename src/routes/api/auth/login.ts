import { createFileRoute } from "@tanstack/react-router";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  login,
  logout,
  validateSession,
} from "@/lib/auth";
import { z } from "zod";

// POST /api/auth/login — email/password sign-in, sets the session cookie.
const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const Route = createFileRoute("/api/auth/login")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Email or password is incorrect." }, { status: 400 });
        }

        const result = await login(parsed.data.email, parsed.data.password);
        if (!result.ok) {
          const status = result.error === "rate_limited" ? 429 : 401;
          const message =
            result.error === "rate_limited"
              ? "Too many failed attempts. Please wait a few minutes and try again."
              : "Email or password is incorrect.";
          return Response.json({ error: message }, { status });
        }

        setCookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions(SESSION_TTL_SECONDS));
        return Response.json({
          user: { id: result.user.id, email: result.user.email, isAdmin: result.user.roles.includes("admin") },
        });
      },
    },
  },
});
