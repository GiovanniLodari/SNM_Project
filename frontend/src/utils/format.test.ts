import { describe, expect, it } from "vitest";
import {
  NON_DISPONIBILE,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "./format.ts";

describe("formatNumber", () => {
  it("usa i separatori italiani a prescindere dal locale del browser", () => {
    // Il punto dell'utility: 28 chiamate usavano toLocaleString() senza
    // locale, quindi seguivano quello della macchina. Su un browser inglese la
    // stessa pagina mostrava "1.234" accanto a "1,234".
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("distingue lo zero dal dato assente", () => {
    // Uno 0 e' una misura, null e undefined no: confonderli e' esattamente
    // il difetto che ha prodotto le percentuali inventate.
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(null)).toBe(NON_DISPONIBILE);
    expect(formatNumber(undefined)).toBe(NON_DISPONIBILE);
  });

  it("tratta NaN come dato assente", () => {
    expect(formatNumber(Number.NaN)).toBe(NON_DISPONIBILE);
  });
});

describe("formatDecimal", () => {
  it("limita i decimali", () => {
    // L'italiano non raggruppa i numeri a quattro cifre (minimumGroupingDigits
    // vale 2 in CLDR): 2571 resta "2571", mentre 12571 diventa "12.571".
    // La prosa che era scritta a mano diceva "2.571 nodi", una forma che
    // toLocaleString("it-IT") non produrrebbe mai.
    expect(formatDecimal(2571.4567, 1)).toBe("2571,5");
    expect(formatDecimal(12571.4567, 1)).toBe("12.571,5");
    expect(formatDecimal(4.4, 0)).toBe("4");
  });

  it("propaga il ripiego", () => {
    expect(formatDecimal(null)).toBe(NON_DISPONIBILE);
  });
});

describe("formatPercent", () => {
  it("attende la scala 0-100, non 0-1", () => {
    expect(formatPercent(25.366, 2)).toBe("25,37%");
  });

  it("lo zero percento resta una misura", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe(NON_DISPONIBILE);
  });
});

describe("formatDate e formatDateTime", () => {
  it("formattano una data valida", () => {
    expect(formatDate("2026-08-12T10:30:00Z")).toContain("2026");
  });

  it("gestiscono input assente", () => {
    expect(formatDate(null)).toBe(NON_DISPONIBILE);
    // formatDateTime rende stringa vuota: e' usata inline nelle tabelle, dove
    // "n/d" su ogni riga senza timestamp sarebbe rumore.
    expect(formatDateTime(null)).toBe("");
  });

  it("su input non valido formatDateTime rende il valore grezzo", () => {
    expect(formatDateTime("non-una-data")).toBe("non-una-data");
  });
});
