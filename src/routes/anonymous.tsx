import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/anonymous")({
  beforeLoad: () => {
    throw redirect({ to: "/clean" });
  },
});
