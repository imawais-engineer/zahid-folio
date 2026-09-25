import { createFileRoute } from "@tanstack/react-router";
import { requireAdminFromRequest } from "@/lib/admin-guard";
import { storeUpload, deleteUploadByUrl } from "@/lib/storage";

// Admin image upload API — stores files on the local filesystem volume and
// returns app-relative /uploads/<name> URLs (replaces Supabase Storage).

export const Route = createFileRoute("/api/admin/upload")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await requireAdminFromRequest())) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart form data" }, { status: 400 });
        }

        const urls: string[] = [];
        const errors: string[] = [];
        for (const value of form.getAll("files")) {
          if (!(value instanceof File)) continue;
          if (!value.type.startsWith("image/")) {
            errors.push(`“${value.name}” is not an image and was not uploaded.`);
            continue;
          }
          if (value.size > 10 * 1024 * 1024) {
            errors.push(`“${value.name}” is larger than 10 MB and was not uploaded.`);
            continue;
          }
          try {
            const stored = await storeUpload(value);
            urls.push(stored.url);
          } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
          }
        }

        if (urls.length === 0 && errors.length > 0) {
          return Response.json({ error: errors.join(" ") }, { status: 400 });
        }
        return Response.json({ urls, errors });
      },

      DELETE: async ({ request }) => {
        if (!(await requireAdminFromRequest())) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        const url = new URL(request.url);
        const target = url.searchParams.get("url") ?? "";
        const deleted = await deleteUploadByUrl(target);
        return Response.json({ ok: deleted });
      },
    },
  },
});
