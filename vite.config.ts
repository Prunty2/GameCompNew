import { defineConfig } from "vitest/config";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __PR_NUMBER__: JSON.stringify("140"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
