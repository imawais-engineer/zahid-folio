// Standard TanStack Start + Vite configuration (self-hosted build).
// Replaces the Lovable-managed config wrapper with the equivalent plugins:
//   - tailwindcss (styles.css imports "tailwindcss")
//   - tsconfigPaths ("@/*" alias)
//   - tanstackStart (server entry redirected to src/server.ts, the SSR error wrapper)
//   - viteReact
//   - nitro (build only; NITRO_PRESET=node-server selects the Node server output)
import { defineConfig, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
    // Build-only; skipped on `vite dev`.
    ...(process.env["NODE_ENV"] === "development" ? [] : [nitro({ defaultPreset: "node-server" })]),
  ],
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
} as UserConfig);
