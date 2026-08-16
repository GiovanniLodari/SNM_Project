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
    rollupOptions: {
      output: {
        /**
         * Separa le dipendenze che non cambiano mai dal codice che cambia a
         * ogni modifica.
         *
         * Senza questa divisione React, MUI, emotion e il router finivano
         * nello stesso chunk d'ingresso del codice dell'applicazione: 481 kB
         * che il browser riscaricava per intero anche dopo aver corretto una
         * stringa in una pagina, perche' l'hash del file cambiava comunque.
         * Divisi, una consegna che tocca solo l'interfaccia lascia valida la
         * copia in cache della parte grossa.
         *
         * `echarts` e `recharts` non sono elencati di proposito: sono gia'
         * isolati dalle rotte lazy, e forzarli qui li anticiperebbe al primo
         * caricamento, che e' l'opposto di cio' che serve.
         */
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@emotion/react", "@emotion/styled"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // I test di pagina montano un capitolo intero - indice, atti, griglie,
    // decine di righe - dentro jsdom, che non ha accelerazione di alcun tipo:
    // il solo primo render puo' costare qualche secondo su una macchina
    // occupata. Con i 5 secondi predefiniti fallivano per il tempo, non per il
    // comportamento, ed e' il tipo di rosso che insegna a ignorare i rossi.
    testTimeout: 20000,
  },
});
