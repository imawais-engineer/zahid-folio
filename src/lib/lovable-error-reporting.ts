// Local no-op error reporting (previously forwarded to the Lovable editor's
// telemetry hooks; those hooks never exist in self-hosted production).
export type ErrorReportContext = Record<string, unknown>;

export function reportLovableError(_error: unknown, _context: ErrorReportContext = {}) {
  // Intentionally a no-op: production error details are logged server-side via
  // src/lib/error-capture.ts. Kept as a stub so error boundaries stay wired.
}
