import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});

