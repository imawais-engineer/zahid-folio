import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/site/Landing";

export const Route = createFileRoute("/clean")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Alpha Insights | Strategic Finance & FP&A Advisory" },
      { name: "description", content: "FP&A, financial modelling, management reporting and corporate finance advisory from Alpha Insights." },
      { property: "og:title", content: "Alpha Insights | Strategic Finance & FP&A Advisory" },
      { property: "og:description", content: "FP&A, financial modelling, management reporting and corporate finance advisory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Landing showPhoto={false} />,
});
