import { describe, expect, it } from "vitest";
import { isRouteActive } from "./navigation.ts";
import { CAPITOLI } from "../navigazione.ts";

/** Tutte le rotte che compaiono nella sidebar, appiattite dai capitoli. */
const PERCORSI_DEL_MENU = CAPITOLI.flatMap((capitolo) => capitolo.voci.map((voce) => voce.path));

describe("isRouteActive", () => {
  it("evidenzia la voce del percorso aperto", () => {
    expect(isRouteActive("/detection", "/detection")).toBe(true);
    expect(isRouteActive("/posts", "/posts")).toBe(true);
  });

  it("non evidenzia i fratelli che condividono il prefisso", () => {
    // Il difetto originale: quando i quattro rilevatori avevano una rotta
    // ciascuna, aprendo Binoculars restava accesa anche la voce FastDetectGPT.
    // Le rotte sono cambiate ma l'invariante no, quindi si verifica con dei
    // percorsi fratelli qualsiasi.
    expect(isRouteActive("/detection-altro", "/detection")).toBe(false);
    expect(isRouteActive("/posts-archivio", "/posts")).toBe(false);
  });

  it("evidenzia la voce padre quando si apre un figlio", () => {
    expect(isRouteActive("/posts/12", "/posts")).toBe(true);
  });

  it("la panoramica resta accesa solo sulla radice", () => {
    expect(isRouteActive("/", "/")).toBe(true);
    expect(isRouteActive("/posts", "/")).toBe(false);
    expect(isRouteActive("/fact-check", "/")).toBe(false);
  });

  it("una sola voce risulta attiva per ogni percorso del menu", () => {
    // I percorsi vengono dai capitoli veri: aggiungere una voce alla sidebar
    // che collida con un'altra fa fallire questo test invece di produrre due
    // voci accese in silenzio.
    for (const corrente of PERCORSI_DEL_MENU) {
      const attive = PERCORSI_DEL_MENU.filter((percorso) => isRouteActive(corrente, percorso));
      expect({ corrente, attive }).toEqual({ corrente, attive: [corrente] });
    }
  });
});
