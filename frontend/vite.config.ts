import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo el dev server de Vite corre en :5173 y el backend FastAPI
// en :8080. Todas las llamadas a /api/* se proxean al backend para evitar
// CORS en el navegador y mantener una sola base URL en el cliente.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
