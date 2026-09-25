import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return { user: data.user, assuranceLevel: assurance?.currentLevel ?? "aal1" };
  },
  component: () => <Outlet />,
});
