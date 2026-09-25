import { getCookie, getRequest } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE_NAME,
  validateSession,
  setRequestMeta,
  clearRequestMeta,
  type AuthContext,
} from "@/lib/auth";

// Resolves the current session from the HttpOnly session cookie.
// Extracted from the old global middleware so it runs ONLY where needed:
// server functions that actually read `context.auth` (none today — admin
// server routes use requireAdminFromRequest) plus future server functions.
// The old always-on middleware added a DB round trip to every SSR/API request.
export async function resolveAuthFromRequest(): Promise<AuthContext> {
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

  return auth;
}
