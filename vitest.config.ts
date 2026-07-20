import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Alias allineati a vite.config.ts / tsconfig: i test importano moduli client
  // che usano `@shared` (fonte NDA condivisa) e `@`.
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
