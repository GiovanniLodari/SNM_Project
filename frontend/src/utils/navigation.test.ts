import { describe, expect, it } from "vitest";
import { isRouteActive } from "./navigation.ts";

describe("isRouteActive", () => {
  it("evidenzia la voce del percorso aperto", () => {
    expect(isRouteActive("/ai-detection", "/ai-detection")).toBe(true);
    expect(isRouteActive("/posts", "/posts")).toBe(true);
  });

  it("non evidenzia i fratelli che condividono il prefisso", () => {
    // Il difetto originale: aprendo Binoculars, Desklib o AdaDetectGPT, la voce
    // "IA: FastDetectGPT" restava accesa insieme a quella davvero selezionata.
    for (const percorso of [
      "/ai-detection-binoculars",
      "/ai-detection-desklib",
      "/ai-detection-ada",
    ]) {
      expect(isRouteActive(percorso, "/ai-detection")).toBe(false);
      expect(isRouteActive(percorso, percorso)).toBe(true);
    }
  });

  it("evidenzia la voce padre quando si apre un figlio", () => {
    expect(isRouteActive("/posts/12", "/posts")).toBe(true);
    expect(isRouteActive("/ai-detection/desklib", "/ai-detection")).toBe(true);
  });

  it("la dashboard resta accesa solo sulla radice", () => {
    expect(isRouteActive("/", "/")).toBe(true);
    expect(isRouteActive("/posts", "/")).toBe(false);
    expect(isRouteActive("/fact-check", "/")).toBe(false);
  });

  it("una sola voce risulta attiva per ogni percorso del menu", () => {
    const percorsi = [
      "/",
      "/posts",
      "/ai-detection",
      "/ai-detection-binoculars",
      "/ai-detection-desklib",
      "/ai-detection-ada",
      "/detector-comparison",
      "/fact-check",
      "/accounts",
      "/influence-maximization",
      "/pipelines",
      "/db-sync",
    ];

    for (const corrente of percorsi) {
      const attive = percorsi.filter((p) => isRouteActive(corrente, p));
      expect({ corrente, attive }).toEqual({ corrente, attive: [corrente] });
    }
  });
});
