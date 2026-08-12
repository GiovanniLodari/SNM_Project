/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In sviluppo il dev server di Vite gira su :5173 e il backend FastAPI su
// :8088. Tutte le chiamate a /api/* sono inoltrate al backend per evitare
// problemi di CORS nel browser e tenere una sola base URL nel client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8088",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
