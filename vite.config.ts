import { defineConfig, type UserConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Shared base config — Vite's defineConfig needs a plain object (not async fn).
// Nitro is always included; it will be skipped at dev time by its own logic.
export default defineConfig({
  plugins: [
    // Path aliases (@/ → src/)
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // Tailwind v4
    tailwindcss(),
    // TanStack Start (SSR + server functions)
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Nitro — targets Vercel for production; auto-skips in dev
    nitro({
      preset: "vercel",
    }),
    // React transform (must come after TanStack Start)
    react(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  server: { host: "::", port: 8080 },
} satisfies UserConfig);
