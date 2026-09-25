import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicProjectBySlug } from "@/lib/db/projects";
import { normalizeProjectRow, type Project } from "./projects.types";

export const getProjectBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<Project | null> => {
    const row = await getPublicProjectBySlug(data.slug);
    return row ? normalizeProjectRow(row) : null;
  });
