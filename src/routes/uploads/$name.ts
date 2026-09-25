import { createFileRoute } from "@tanstack/react-router";
import { readUpload, etagFor } from "@/lib/storage";

// Public file serving for locally stored uploads: GET /uploads/<stored-name>.
// Only whitelisted stored-name formats are accepted (uuid.ext) so arbitrary
// filesystem paths can never be addressed.

export const Route = createFileRoute("/uploads/$name")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const file = await readUpload(params.name);
        if (!file) {
          return new Response("Not found", { status: 404 });
        }
        const etag = etagFor(file.body);
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304, headers: { ETag: etag } });
        }
        return new Response(new Uint8Array(file.body), {
          status: 200,
          headers: {
            "Content-Type": file.contentType,
            "Content-Length": String(file.body.byteLength),
            "Cache-Control": "public, max-age=31536000, immutable",
            ETag: etag,
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
