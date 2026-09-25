import { createMiddleware } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE_NAME,
  validateSession,
  setRequestMeta,
  clearRequestMeta,
  type AuthContext,
} from "@/lib/auth";

// Server-side function middleware: resolves the current session from the
// HttpOnly session cookie on every server function call and exposes it as
// `context.auth` (null when signed out). Also captures request metadata so
// login/session records can store user agent + IP.
export const sessionMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    let token: string | undefined;
    let userAgent: string | null = null;
    let ip: string | null = null;

    try {
      const request = getRequest();
      if (request?.headers) {
        token = getCookie(SESSION_COOKIE_NAME) ?? undefined;
        userAgent = request.headers.get("user-agent");
        const forwarded = request.headers.get("x-forwarded-for");
        ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
      }
    } catch {
      // No request context (e.g. non-HTTP invocation) — treat as anonymous.
    }

    setRequestMeta({ userAgent, ip });

    let auth: AuthContext = null;
    try {
      auth = await validateSession(token);
    } catch (error) {
      // Database unavailable: fail closed but keep SSR pages renderable.
      console.error("[auth] session validation failed:", error);
      auth = null;
    } finally {
      clearRequestMeta();
    }

    return next({ context: { auth } });
  },
);
