import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";
import { listProjectSlugs } from "@/lib/db/projects";

const BASE_URL = process.env["SITE_URL"] ?? "https://alphainsights.consulting";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const routeId = "/projects/$slug";
        if (isSitemapRouteIncluded(router.routesById[routeId])) {
          const slugs = await listProjectSlugs();
          for (const row of slugs) {
            if (!row.slug) continue;
            const location = router.buildLocation({
              to: "/projects/$slug",
              params: { slug: row.slug },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, routeId);
            if (path) entries.push({ path });
          }
        }

        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
