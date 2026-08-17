import { describe, expect, it } from "vitest";
import { ATTI_DETECTION, MODELLI, MODELLO_PREDEFINITO, risolviModello } from "./detectionContent.ts";

describe("detectionContent", () => {
  it("descrive quattro modelli con chiavi distinte", () => {
    expect(MODELLI).toHaveLength(4);
    expect(new Set(MODELLI.map((m) => m.id)).size).toBe(4);
    expect(new Set(MODELLI.map((m) => m.idIndagine)).size).toBe(4);
  });

  it("il modello predefinito esiste nel registro", () => {
    // Un default non presente farebbe ricadere silenziosamente la richiesta su
    // un altro modello, con l'intestazione che ne annuncia uno e i dati di un
    // altro.
    expect(MODELLI.some((m) => m.id === MODELLO_PREDEFINITO)).toBe(true);
  });

  it("descrive tre atti con ancore distinte, ognuno con una domanda", () => {
    expect(ATTI_DETECTION).toHaveLength(3);
    expect(new Set(ATTI_DETECTION.map((a) => a.id)).size).toBe(3);
    ATTI_DETECTION.forEach((atto) => {
      expect(atto.domanda.endsWith("?")).toBe(true);
    });
  });

  describe("risolviModello", () => {
    it("riconosce le chiavi del registro", () => {
      MODELLI.forEach((modello) => {
        expect(risolviModello(modello.id).id).toBe(modello.id);
      });
    });

    it("accetta gli alias che il backend tollera e i vecchi indirizzi", () => {
      // /api/ai-detection accetta ada, ada_local e adadetect per lo stesso
      // modello: un link salvato con una di queste forme deve continuare ad
      // aprire il modello giusto invece di ricadere sul predefinito.
      expect(risolviModello("ada_local").id).toBe("ada");
      expect(risolviModello("adadetect").id).toBe("ada");
      expect(risolviModello("fastdetectgpt").id).toBe("fastdetect");
    });

    it("ricade sul primo modello per chiavi sconosciute o assenti", () => {
      expect(risolviModello("inesistente").id).toBe(MODELLI[0].id);
      expect(risolviModello(null).id).toBe(MODELLI[0].id);
      expect(risolviModello(undefined).id).toBe(MODELLI[0].id);
    });
  });
});
