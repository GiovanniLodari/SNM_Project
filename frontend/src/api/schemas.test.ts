import { describe, expect, it } from "vitest";
import {
  dashboardSchema,
  detectorComparisonSummarySchema,
  factCheckSchema,
} from "./schemas.ts";

const dashboardValida = {
  posts_total: 100,
  follows_total: 50,
  ai_done: 10,
  ai_eligible: 20,
  ai_classified: 5,
  ai_threshold: 0.5,
  fact_check_done: 3,
  fact_check_eligible: 8,
};

describe("dashboardSchema", () => {
  it("accetta una risposta corretta", () => {
    expect(dashboardSchema.safeParse(dashboardValida).success).toBe(true);
  });

  it("rifiuta un campo mancante", () => {
    const { posts_total: _omesso, ...incompleta } = dashboardValida;
    const esito = dashboardSchema.safeParse(incompleta);
    expect(esito.success).toBe(false);
  });

  it("rifiuta un numero arrivato come stringa", () => {
    // Il caso che sfuggiva del tutto: senza validazione, "100" finiva in un
    // calcolo e produceva concatenazioni o NaN molto piu' avanti.
    const esito = dashboardSchema.safeParse({ ...dashboardValida, posts_total: "100" });
    expect(esito.success).toBe(false);
  });
});

describe("factCheckSchema", () => {
  const valida = {
    done: 10,
    eligible: 20,
    verdicts: { vero: 5, falso: 5 },
    page_rows: [],
    page: 1,
    page_size: 50,
    total_count: 10,
    has_next: false,
    verdict_options: ["vero", "falso"],
    selected_verdicts: [],
  };

  it("accetta una risposta corretta", () => {
    expect(factCheckSchema.safeParse(valida).success).toBe(true);
  });

  it("rifiuta una risposta senza total_count", () => {
    // total_count e' stato aggiunto correggendo il bug della ricerca: se il
    // backend tornasse indietro, la UI mostrerebbe "undefined risultati".
    const { total_count: _omesso, ...senzaTotale } = valida;
    expect(factCheckSchema.safeParse(senzaTotale).success).toBe(false);
  });

  it("accetta confidence null nelle righe", () => {
    const conRiga = {
      ...valida,
      page_rows: [
        {
          post: {
            id: 1,
            language: "it",
            content: "testo",
            created_at: null,
            acct: "tizio",
            bot: false,
            domain: "example.com",
          },
          row: { id: 1, verdict: "vero", confidence: null, reasoning: "perche' si" },
        },
      ],
    };
    expect(factCheckSchema.safeParse(conRiga).success).toBe(true);
  });
});

describe("detectorComparisonSummarySchema", () => {
  const modello = {
    id: "binoculars",
    name: "Binoculars",
    type: "Cross-Perplexity Ratio",
    scored_count: 0,
    ai_detected_count: 0,
    ai_percentage: null,
    description: "descrizione",
  };

  it("accetta ai_percentage null", () => {
    // Distinzione voluta: null significa "non misurabile", 0 significa
    // "misurato, nessun post IA". Il tipo TypeScript prometteva `number` e
    // mentiva.
    expect(
      detectorComparisonSummarySchema.safeParse({ models: [modello] }).success,
    ).toBe(true);
  });

  it("accetta bot_investigation null quando il DB non risponde", () => {
    const esito = detectorComparisonSummarySchema.safeParse({
      models: [modello],
      bot_investigation: null,
    });
    expect(esito.success).toBe(true);
  });

  it("rifiuta un modello senza scored_count", () => {
    const { scored_count: _omesso, ...incompleto } = modello;
    expect(
      detectorComparisonSummarySchema.safeParse({ models: [incompleto] }).success,
    ).toBe(false);
  });
});
