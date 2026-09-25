import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Access = "interactive" | "preview" | "request";

export const accessLabel = (a: string) =>
  a === "interactive" ? "Interactive" : a === "preview" ? "Preview only" : "Available on request";

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("priority", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const CFO_PACK_SLUG = "cfo-pack";

export function uniqueValues(list: Project[], key: "platforms" | "capabilities" | "industries" | "tags") {
  return Array.from(new Set(list.flatMap((p) => p[key]))).sort((a, b) => a.localeCompare(b));
}
