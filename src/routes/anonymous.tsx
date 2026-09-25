import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/anonymous")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/clean" });
  },
});
