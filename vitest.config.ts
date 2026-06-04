import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// v3.3 — Vitest setup. Smoke tests live under lib/__tests__/ and cover the
// pure rule engines (scoring, equity, skills). UI assertions are out of
// scope; we lean on `npm run build` for type/lint signal. Resolves the
// "@/lib/..." alias so test files can import the same way components do.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
