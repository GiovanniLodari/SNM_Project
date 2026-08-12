import { describe, expect, it } from "vitest";
import { percentileDaIstogramma } from "./statistics.ts";

/** Istogramma a 10 bucket da una lista di frequenze. */
const istogramma = (conteggi: number[]) => conteggi.map((count) => ({ count }));

describe("percentileDaIstogramma", () => {
  it("restituisce null se l'istogramma manca o e' vuoto", () => {
    expect(percentileDaIstogramma(undefined, 0.5)).toBeNull();
    expect(percentileDaIstogramma(null, 0.5)).toBeNull();
    expect(percentileDaIstogramma([], 0.5)).toBeNull();
  });

  it("restituisce null se tutti i bucket sono a zero", () => {
    // Un istogramma senza osservazioni non ha percentili: distinguerlo dal
    // valore 0 e' il punto, altrimenti la UI mostrerebbe "0%" come se fosse
    // una misura.
    expect(percentileDaIstogramma(istogramma([0, 0, 0, 0]), 0.5)).toBeNull();
  });

  it("su una distribuzione uniforme cade dove ci si aspetta", () => {
    const uniforme = istogramma(Array(10).fill(100));
    expect(percentileDaIstogramma(uniforme, 0.25)).toBeCloseTo(25, 0);
    expect(percentileDaIstogramma(uniforme, 0.5)).toBeCloseTo(50, 0);
    expect(percentileDaIstogramma(uniforme, 0.75)).toBeCloseTo(75, 0);
  });

  it("su una distribuzione bimodale non finisce al centro", () => {
    // E' il caso reale dei detector IA: la massa sta agli estremi e il centro
    // e' quasi vuoto. La vecchia formula (mediana ± deviazione * 0.674)
    // assumeva la normalita' e collocava i quartili intorno al centro, dove
    // non c'e' quasi nessuna osservazione.
    const bimodale = istogramma([500, 0, 0, 0, 0, 0, 0, 0, 0, 500]);

    const q1 = percentileDaIstogramma(bimodale, 0.25);
    const q3 = percentileDaIstogramma(bimodale, 0.75);

    expect(q1).not.toBeNull();
    expect(q3).not.toBeNull();
    // Il primo quartile sta nel primo bucket, il terzo nell'ultimo.
    expect(q1!).toBeLessThan(10);
    expect(q3!).toBeGreaterThanOrEqual(90);
  });

  it("tutta la massa in un solo bucket: ogni quantile cade li' dentro", () => {
    const concentrata = istogramma([0, 0, 1000, 0, 0, 0, 0, 0, 0, 0]);
    const q1 = percentileDaIstogramma(concentrata, 0.25);
    const q3 = percentileDaIstogramma(concentrata, 0.75);

    // Il terzo bucket copre l'intervallo [20, 30).
    expect(q1!).toBeGreaterThanOrEqual(20);
    expect(q1!).toBeLessThan(30);
    expect(q3!).toBeGreaterThanOrEqual(20);
    expect(q3!).toBeLessThan(30);
  });

  it("i quantili crescono in modo monotono", () => {
    const curva = istogramma([10, 40, 120, 300, 220, 150, 90, 40, 20, 10]);
    const valori = [0.1, 0.25, 0.5, 0.75, 0.9].map(
      (f) => percentileDaIstogramma(curva, f)!,
    );
    for (let i = 1; i < valori.length; i++) {
      expect(valori[i]).toBeGreaterThanOrEqual(valori[i - 1]);
    }
  });
});
