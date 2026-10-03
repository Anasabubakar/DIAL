import { defineConfig } from "tsup";

// Pre-bundles the API into a single Vercel function: api/index.js. Third-party deps stay external (installed by Vercel).
export default defineConfig({ entry: { index: "src/vercel.ts" }, outDir: "api", format: ["esm"], target: "node22", noExternal: [/^@dial\//], clean: true, outExtension: () => ({ js: ".js" }) });
