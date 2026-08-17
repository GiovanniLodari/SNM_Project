import { describe, expect, it } from "vitest";
import { ATTI, LIMITI, MODELLO_IC, PROBLEMA } from "./influenceContent.ts";

describe("influenceContent", () => {
  it("descrive quattro atti con ancore distinte", () => {
    expect(ATTI).toHaveLength(4);
    const ancore = ATTI.map((a) => a.id);
    expect(new Set(ancore).size).toBe(4);
  });

  it("ogni atto pone una domanda", () => {
    // La forma della narrazione: ogni atto apre con una domanda e chiude con
    // una risposta. Un atto senza domanda e' tornato a essere un contenitore.
    ATTI.forEach((atto) => {
      expect(atto.domanda.length).toBeGreaterThan(10);
      expect(atto.domanda.endsWith("?")).toBe(true);
    });
  });

  it("dichiara la formula e la taratura del modello IC", () => {
    expect(MODELLO_IC.formula).toContain("p0");
    expect(MODELLO_IC.p0).toBe(0.05);
    expect(MODELLO_IC.tetto).toBe(0.999);
  });

  it("enuncia il problema con il vincolo di budget", () => {
    expect(PROBLEMA.enunciato).toContain("Independent Cascade");
  });

  it("elenca i limiti metodologici", () => {
    expect(LIMITI.length).toBeGreaterThanOrEqual(4);
    LIMITI.forEach((l) => expect(l.titolo.length).toBeGreaterThan(0));
  });
});
