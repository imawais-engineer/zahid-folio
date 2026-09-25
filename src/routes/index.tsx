import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/site/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alpha Insights | FP&A, Financial Modelling & CFO Advisory" },
      { name: "description", content: "Independent finance advisory led by Chaudhary Zahid Ali, ACCA, CMA, MBA." },
      { property: "og:title", content: "Alpha Insights | FP&A, Financial Modelling & CFO Advisory" },
      { property: "og:description", content: "Independent finance advisory led by Chaudhary Zahid Ali, ACCA, CMA, MBA." },
    ],
  }),
  component: () => <Landing showPhoto />,
});
