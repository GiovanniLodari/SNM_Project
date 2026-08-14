/**
 * Verifica che gli schemi Zod accettino le risposte *reali* del backend.
 *
 * I test in schemas.test.ts usano payload costruiti a mano: dimostrano che la
 * validazione rifiuta cio' che deve rifiutare, ma non che accetti cio' che il
 * backend manda davvero. Uno schema troppo severo romperebbe pagine
 * funzionanti, che e' il rischio principale nell'aggiungere validazione a
 * runtime su un'API gia' in uso.
 *
 * I campioni in fixtures/ sono catturati dal backend con dati veri. Vanno
 * rigenerati se le risposte cambiano forma: e' il loro scopo: far fallire il
 * test quando succede.
 */
import { describe, expect, it } from "vitest";
import {
  accountsStatsSchema,
  corpusSchema,
  dashboardSchema,
  detectorComparisonSummarySchema,
  factCheckSchema,
  influenceSummarySchema,
} from "./schemas.ts";

import dashboard from "./fixtures/dashboard.json";
import accounts from "./fixtures/accounts.json";
import corpus from "./fixtures/corpus.json";
import factCheck from "./fixtures/fact-check.json";
import detectorComparison from "./fixtures/detector-comparison-summary.json";
import influenceSummary from "./fixtures/influence-summary.json";

const casi = [
  ["dashboard", dashboardSchema, dashboard],
  ["accounts", accountsStatsSchema, accounts],
  ["corpus", corpusSchema, corpus],
  ["fact-check", factCheckSchema, factCheck],
  ["detector-comparison/summary", detectorComparisonSummarySchema, detectorComparison],
  ["influence-maximization/summary", influenceSummarySchema, influenceSummary],
] as const;

describe("gli schemi accettano le risposte reali del backend", () => {
  it.each(casi)("%s", (_nome, schema, campione) => {
    const esito = schema.safeParse(campione);
    if (!esito.success) {
      // Il messaggio elenca i campi discordanti: serve a capire subito se a
      // sbagliare e' lo schema o il backend.
      const dettagli = esito.error.issues
        .map((i) => `${i.path.join(".") || "(radice)"}: ${i.message}`)
        .join("\n  ");
      throw new Error(`schema e risposta reale non combaciano:\n  ${dettagli}`);
    }
    expect(esito.success).toBe(true);
  });
});
