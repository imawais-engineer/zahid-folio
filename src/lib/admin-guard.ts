import { getCookie } from "@tanstack/react-start/server";
import { SESSION_COOKIE_NAME, validateSession, requireAdmin, type SessionUser } from "@/lib/auth";

// Server-route authorization guard: resolves the session from the HttpOnly
// cookie and enforces the admin role. Returns the admin user or null.
// (Server functions get the same protection via sessionMiddleware context.)
export async function requireAdminFromRequest(): Promise<SessionUser | null> {
  try {
    const token = getCookie(SESSION_COOKIE_NAME);
    const auth = await validateSession(token);
    return await requireAdmin(auth);
  } catch {
    return null;
  }
}
