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
  // `vite preview` non eredita `server.proxy`: senza questo blocco l'unico modo
  // di guardare il bundle di produzione era servirlo dietro al backend, e le
  // verifiche finivano per farsi tutte in sviluppo - dove i chunk non esistono
  // e i pesi reali non si vedono.
  preview: {
    port: 4173,
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
         * Isola React dal codice dell'applicazione.
         *
         * React, react-dom e il router servono su ogni rotta, quindi
         * raggrupparli non anticipa nulla che non arriverebbe comunque; in
         * cambio una consegna che tocca solo l'interfaccia lascia valida la
         * copia in cache di 165 kB che prima venivano riscaricati per intero
         * a ogni modifica, perche' stavano nello stesso chunk d'ingresso.
         *
         * **MUI non e' elencato di proposito, ed e' stato provato.** Messo qui
         * produce un chunk unico da 398 kB caricato su ogni rotta; lasciato a
         * rollup viene diviso per uso reale - il guscio (drawer, appbar,
         * elenco) nell'ingresso, e TextField, Chip, Dialog, ToggleButton nei
         * chunk condivisi delle pagine che li aprono davvero. Sulla Panoramica,
         * che non ha campi ne' modali, la differenza misurata e' di circa
         * 200 kB in meno. Lo stesso vale per `echarts` e `recharts`: gia'
         * isolati dalle rotte lazy, elencarli qui li anticiperebbe al primo
         * caricamento.
         */
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
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
