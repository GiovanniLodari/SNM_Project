import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// `findBy*` e `waitFor` aspettano un secondo, che basta finche' si attende un
// singolo render. Non basta quando si attende una catena di richieste - i tre
// blocchi che la pagina dei post ripristina dalla URL, per esempio - mentre la
// suite intera occupa tutti i core: l'asserzione scadeva per il carico della
// macchina e non per un difetto del codice, cioe' il tipo di rosso che insegna
// a ignorare i rossi. Il tetto per test resta quello di vite.config.ts.
configure({ asyncUtilTimeout: 8000 });

// Smonta l'albero renderizzato dopo ogni test: senza, i componenti restano nel
// DOM di jsdom e le query di un test trovano i nodi di quello precedente.
afterEach(() => {
  cleanup();
});
