import { z } from "zod";

/**
 * Schemi Zod per validare le risposte dell'API a runtime.
 *
 * I tipi TypeScript in client.ts spariscono alla compilazione: finora l'app si
 * fidava di qualunque JSON arrivasse, e quando backend e frontend divergevano
 * il problema si manifestava lontano dalla causa - un `undefined` dentro un
 * `toLocaleString`, un grafico vuoto, una percentuale calcolata su NaN. La
 * divergenza c'era davvero: `evidence` era `any`, `FactCheckResponse` era
 * dichiarata due volte, e alcuni campi promettevano `number` mentre l'API
 * restituisce `number | null`.
 *
 * Gli schemi coprono gli endpoint dove un dato malformato fa piu' danno, non
 * tutti: validare cio' che non si usa aggiunge attrito senza ridurre rischio.
 * Un fallimento viene sollevato come errore, quindi TanStack Query lo espone
 * come `isError` e la pagina mostra il suo stato d'errore - che e' preferibile
 * a disegnare numeri di cui non conosciamo la forma.
 */

/** Numero che accetta esplicitamente null: molte metriche non sono calcolabili. */
const numeroOpzionale = z.number().nullable();

export const dashboardSchema = z.object({
  posts_total: z.number(),
  follows_total: z.number(),
  ai_done: z.number(),
  ai_eligible: z.number(),
  ai_classified: z.number(),
  ai_threshold: z.number(),
  fact_check_done: z.number(),
  fact_check_eligible: z.number(),
});

export const accountsStatsSchema = z.object({
  bot_total: z.number(),
  nonbot_total: z.number(),
  ai_producers_total: z.number(),
  ai_and_bot: z.number(),
  ai_and_not_bot: z.number(),
});

const postSchema = z.object({
  id: z.number(),
  language: z.string().nullable(),
  content: z.string(),
  created_at: z.string().nullable(),
  acct: z.string(),
  bot: z.boolean(),
  domain: z.string(),
});

const factCheckRowSchema = z.object({
  id: z.number(),
  verdict: z.string(),
  confidence: numeroOpzionale,
  reasoning: z.string(),
});

export const factCheckSchema = z.object({
  done: z.number(),
  eligible: z.number(),
  verdicts: z.record(z.string(), z.number()),
  page_rows: z.array(z.object({ post: postSchema, row: factCheckRowSchema })),
  page: z.number(),
  page_size: z.number(),
  // Aggiunto correggendo il bug della ricerca: prima la risposta non portava
  // alcun totale filtrato, e `has_next` mentiva.
  total_count: z.number(),
  has_next: z.boolean(),
  verdict_options: z.array(z.string()),
  selected_verdicts: z.array(z.string()),
});

const detectorModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  scored_count: z.number(),
  ai_detected_count: z.number(),
  // null quando il detector non ha valutato nulla: e' diverso da 0%, che
  // sarebbe una misura.
  ai_percentage: numeroOpzionale,
  description: z.string(),
});

const botDetectorStatsSchema = z.object({
  scored: z.number(),
  ai_count: z.number(),
  ai_percentage: numeroOpzionale,
});

export const detectorComparisonSummarySchema = z.object({
  models: z.array(detectorModelSchema),
  comparison_report: z.unknown().optional(),
  binoculars_report: z.unknown().optional(),
  // null quando il DB non e' raggiungibile.
  bot_investigation: z
    .object({
      total_bot_statuses: z.number(),
      total_human_statuses: z.number(),
      models: z.record(z.string(), botDetectorStatsSchema),
    })
    .nullable()
    .optional(),
});

export const influenceSummarySchema = z.object({
  meta: z.object({
    nodes: z.number(),
    edges: z.number(),
    seeds: z.number(),
    reached_nodes: z.number(),
    reached_pct: z.number(),
    num_steps: z.number(),
    note: z.string(),
  }),
  demographics: z.unknown(),
  step_stats: z.array(
    z.object({
      step: z.number(),
      new_nodes: z.number(),
      cumulative_nodes: z.number(),
    }).passthrough(),
  ),
  top_seeds: z.array(z.unknown()),
  top_targets: z.array(z.unknown()),
});
