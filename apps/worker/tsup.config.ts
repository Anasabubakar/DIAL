import { defineConfig } from "tsup";

// Bundle the workspace packages (shipped as TypeScript source); keep third-party deps external.
export default defineConfig({ entry: ["src/main.ts"], format: ["esm"], target: "node22", noExternal: [/^@dial\//], clean: true });
