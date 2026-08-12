import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Smonta l'albero renderizzato dopo ogni test: senza, i componenti restano nel
// DOM di jsdom e le query di un test trovano i nodi di quello precedente.
afterEach(() => {
  cleanup();
});
