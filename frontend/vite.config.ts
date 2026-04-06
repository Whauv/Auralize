import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  test: {
    environment: "happy-dom",
    globals: true,
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"]
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
