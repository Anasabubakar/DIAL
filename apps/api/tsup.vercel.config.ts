import { defineConfig } from "tsup";

// Bundles the API into api/_handler.js (loaded by the committed api/index.js). Third-party deps stay external.
export default defineConfig({ entry: { _handler: "src/vercel.ts" }, outDir: "api", format: ["esm"], target: "node22", noExternal: [/^@dial\//], clean: false, outExtension: () => ({ js: ".js" }) });
