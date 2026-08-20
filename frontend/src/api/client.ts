import type { ZodType } from "zod";
import {
  dashboardSchema,
  accountsStatsSchema,
  corpusSchema,
  factCheckSchema,
  detectorComparisonSummarySchema,
  influenceSummarySchema,
} from "./schemas.ts";

export interface Post {
  id: number;
  language: string | null;
  content: string;
  created_at: string | null;
  acct: string;
  bot: boolean;
  domain: string;
  fastdetect_prob?: number | null;
  binoculars_prob?: number | null;
  desklib_prob?: number | null;
  ada_prob?: number | null;
}

export interface AiScore {
  id: number;
  probability: number;
  criterion?: number | null;
  ntokens?: number | null;
  model?: string;
}


export interface FactCheck {
  id: number;
  verdict: string;
  veracity?: number;
  confidence: number | null;
  reasoning: string;
  evidence_urls?: string;
  evidence?: unknown;
  model?: string;
}


export interface FactCheckResponse {
  done: number;
  eligible: number;
  verdicts: Record<string, number>;
  page_rows: { post: Post; row: FactCheck }[];
  page: number;
  page_size: number;
  /** Righe che soddisfano verdetto e ricerca, non solo quelle della pagina. */
  total_count: number;
  has_next: boolean;
  verdict_options: string[];
  selected_verdicts: string[];
}


export interface DashboardStats {
  posts_total: number;
  follows_total: number;
  ai_done: number;
  ai_eligible: number;
  ai_classified: number;
  ai_threshold: number;
  fact_check_done: number;
  fact_check_eligible: number;
}

export interface PostsResponse {
  posts: Post[];
  available_langs: string[];
  selected_langs: string[];
  page: number;
  page_size: number;
  /**
   * Post che soddisfano i filtri, non solo quelli del blocco corrente.
   *
   * `null` quando il backend non lo calcola perche' costerebbe troppo: dalla
   * seconda pagina in poi, e con una ricerca testuale attiva. E' un'assenza di
   * dato, e va mostrata come tale invece che come zero.
   */
  total_count: number | null;
  has_next: boolean;
  /** I filtri applicati davvero: un valore non ammesso ricade sul default lato
   * server, e senza questo rimando la pagina mostrerebbe un controllo attivo
   * che il backend ha ignorato. */
  search: string;
  author: string;
  order: string;
}

/** Filtri dell'elenco post, nella forma in cui li scrive l'interfaccia. */
export interface FiltriPost {
  lang?: string[];
  page?: number;
  pageSize?: number;
  search?: string;
  /** "tutti" | "bot" | "umani": la dichiarazione del profilo, non un giudizio. */
  author?: string;
  /** "archivio" | "recenti" | "vecchi". */
  order?: string;
}

export interface CorpusLingua {
  lang: string;
  posts: number;
}

export interface CorpusIstanza {
  domain: string;
  posts: number;
  accounts: number;
  bot_posts: number;
}

export interface CorpusResponse {
  posts_total: number;
  /** Account distinti che compaiono come autori, non tutti quelli archiviati. */
  authors_total: number;
  instances_total: number;
  first_post_at: string | null;
  last_post_at: string | null;
  posts_bot: number;
  posts_human: number;
  posts_senza_lingua: number;
  lingue: CorpusLingua[];
  istanze: CorpusIstanza[];
}

export interface PostDetailResponse {
  post: Post | null;
  ai_score: AiScore | null;
  binoculars_score?: AiScore | null;
  desklib_score?: AiScore | null;
  ada_score?: AiScore | null;
  fact_check: FactCheck | null;
}

export interface AccountIstanza {
  domain: string;
  accounts: number;
  bot_accounts: number;
}

/** Follower dichiarati nel profilo, non archi di follow raccolti dal crawler. */
export interface StatisticheFollower {
  /** Account con un valore dichiarato e plausibile. */
  accounts: number;
  mediana: number | null;
  massimo: number | null;
  /**
   * Account il cui valore dichiarato e' stato scartato perche' impossibile
   * (miliardi di follower, o l'esatto massimo di un intero a 32 bit). Il
   * conteggio esiste per poterlo dichiarare invece di far sparire delle righe
   * senza dirlo.
   */
  scartati: number;
}

export interface AccountSeguito {
  id: number;
  acct: string;
  bot: boolean;
  domain: string;
  followers: number;
}

export interface ProduttoreIa {
  id: number;
  acct: string;
  bot: boolean;
  domain: string;
  followers: number | null;
  posts: number | null;
  /** Post dell'account per cui esiste un punteggio del rilevatore. */
  posts_scored: number;
  /** Di quelli, quanti superano la soglia. */
  ai_posts: number;
  mean_prob: number;
}

export interface AccountsStats {
  bot_total: number;
  nonbot_total: number;
  ai_producers_total: number;
  ai_and_bot: number;
  ai_and_not_bot: number;

  /** Quale rilevatore ha prodotto i giudizi di questa pagina: e' uno solo, non
   * il consenso a quattro del Capitolo II. */
  detector: string;
  ai_threshold: number;
  accounts_total: number;
  accounts_con_post: number;
  /** Account con almeno un post valutato: il denominatore onesto dei giudizi. */
  valutati_bot: number;
  valutati_human: number;
  posts_bot: number;
  posts_human: number;
  istanze: AccountIstanza[];
  followers_bot: StatisticheFollower;
  followers_human: StatisticheFollower;
  piu_seguiti: AccountSeguito[];
  top_produttori: ProduttoreIa[];
}

export interface DescriptiveStats {
  total_analyzed: number;
  probability: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  };
  criteria?: {
    mean: number;
    median: number;
    min: number;
    max: number;
  };
  distribution_curve: { bucket: string; count: number; percentage: number }[];
  text_length: {
    avg_chars: number;
    median_chars: number;
    avg_tokens: number;
  };
  bot_breakdown: {
    bots: number;
    humans: number;
    bot_percentage: number;
  };
  top_domains: { domain: string; count: number }[];
}

export interface AiDetectionResponse {
  done: number;
  eligible: number;
  ai_classified: number;
  ai_threshold: number;
  histogram: Record<string, number>;
  bucket_samples?: Record<string, { post: Post; probability: number }[]>;
  stats?: DescriptiveStats;
  page_rows: { post: Post; probability: number }[];
  page: number;
  page_size: number;
  has_next: boolean;
  prob_buckets: string[];
  selected_buckets: string[];
  sort_by?: string;
}




export interface JobRow {
  name: string;
  label: string;
  description: string | null;
  running: boolean;
  pid: number | null;
  takes_param: string | null;
  param_type: string;
  progress_done: number | null;
  progress_total: number | null;
  progress_pct: number | null;
  log_lines: string[];
}

export interface PipelinesResponse {
  jobs: JobRow[];
}

export interface DbSyncResponse {
  export_running: boolean;
  export_log_lines: string[];
  export_zip_ready: boolean;
}

export interface JobActionResponse {
  ok: boolean;
  message: string;
}

export interface GraphNode {
  id: number;
  label: string;
  bot: boolean;
  group?: string;
  domain?: string;
  degree?: number;
}

export interface GraphLink {
  source: number;
  target: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AccountSearchResult {
  id: number;
  acct: string;
  username: string;
  bot: boolean;
  domain: string;
}

export interface AccountField {
  name: string;
  value: string;
  verified_at?: string | null;
}

export interface AccountDetail {
  id: number;
  acct: string;
  username: string;
  display_name: string;
  bot: boolean;
  domain: string;
  avatar?: string | null;
  header?: string | null;
  note?: string | null;
  url?: string | null;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
  created_at?: string | null;
  last_status_at?: string | null;
  fields?: AccountField[];
  fetched_at?: string | null;
}

export interface AccountDetailResponse {
  account: AccountDetail | null;
}

function buildQuery(params: Record<string, string | string[] | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.append(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * GET con validazione opzionale della risposta.
 *
 * Senza `schema` il comportamento e' quello di prima: un cast, che si fida del
 * JSON ricevuto. Con `schema` la forma viene verificata, e una discrepanza fra
 * backend e frontend diventa un errore immediato e localizzato invece di un
 * `undefined` che riemerge molte righe piu' avanti.
 */
async function getJson<T>(url: string, schema?: ZodType): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Errore ${res.status} su ${url}`);
  const payload = await res.json();

  if (!schema) return payload as T;

  // Lo schema fa da guardia sulla forma, non da sorgente del tipo: puo' quindi
  // coprire i campi che contano senza rispecchiare ogni struttura annidata
  // dell'interfaccia. Il tipo dichiarato resta quello di T.
  const esito = schema.safeParse(payload);
  if (!esito.success) {
    const dettagli = esito.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(radice)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Risposta inattesa da ${url} — ${dettagli}`);
  }
  return payload as T;
}

async function postJson<T>(url: string, body: URLSearchParams | FormData): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: isForm ? undefined : { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Errore ${res.status} su ${url}`);
  return (await res.json()) as T;
}

export interface DetectorModelInfo {
  id: string;
  name: string;
  type: string;
  scored_count: number;
  ai_detected_count: number;
  /** null quando il detector non ha valutato nulla: diverso da 0%. */
  ai_percentage: number | null;
  description: string;
}

export interface DetectorComparisonSummaryResponse {
  models: DetectorModelInfo[];
  comparison_report: {
    soglia_ai: number;
    id_totali: number;
    id_presenti_in_tutti_e_4?: number;
    id_presenti_in_tutti_e_3?: number;
    conteggio_ai: {
      ai_per_tutti_e_4?: number;
      ai_per_tutti_e_3?: number;
      ai_per_esattamente_3?: number;
      ai_per_esattamente_2: number;
      ai_per_esattamente_1: number;
      ai_per_nessuno: number;
    };
    /** Conteggi detector -> fascia di consenso, per il diagramma Sankey. */
    flussi_consenso?: Record<string, Record<string, number>>;
    accordo: {
      tutti_e_4_stessa_etichetta?: number;
      tutti_e_3_stessa_etichetta?: number;
      coppie: {
        "bino-gpt"?: number;
        "bino-desk"?: number;
        "bino-ada"?: number;
        "desk-gpt"?: number;
        "desk-ada"?: number;
        "gpt-ada"?: number;
      };
    };
    copertura: {
      fastdetectgpt?: number;
      binoculars: number;
      desklib: number;
      "gpt-neo"?: number;
      adadetectgpt?: number;
    };
  };
  binoculars_report: {
    counts?: {
      total_in_file: number;
      scored: number;
      short_unreliable: number;
      ai_generated: number;
      human: number;
    };
    histogram_pct?: Record<string, number>;
    by_lang?: Record<string, { n: number; ai: number }>;
  };
  // null quando il DB non e' raggiungibile; ai_percentage e' null quando il
  // detector non ha valutato nessun post di account bot.
  bot_investigation?: BotInvestigation | null;
}


export interface BotDetectorStats {
  scored: number;
  ai_count: number;
  ai_percentage: number | null;
}

export type BotDetectorId = "binoculars" | "fastdetectgpt" | "desklib" | "ada";

export interface BotInvestigation {
  total_bot_statuses: number;
  total_human_statuses: number;
  models: Partial<Record<BotDetectorId, BotDetectorStats>>;
}

export interface ComparisonPostRow {
  id: number;
  text: string;
  lang: string;
  created_at: string | null;
  fastdetect_prob: number | null;
  binoculars_prob: number | null;
  desklib_prob: number | null;
  ada_prob: number | null;
  ai_votes: number;
}

export interface DetectorComparisonPostsResponse {
  posts: ComparisonPostRow[];
  total: number;
  page: number;
  page_size: number;
  filter_type: string;
}

export interface InfluenceMeta {
  nodes: number;
  edges: number;
  seeds: number;
  reached_nodes: number;
  reached_pct: number;
  num_steps: number;
  note: string;
}

export interface InfluenceDemographics {
  activated_total: number;
  activated_ai: number;
  activated_human: number;
  seeds_ai: number;
  seeds_human: number;
}

export interface InfluenceStepStat {
  step: number;
  new_nodes: number;
  new_ai: number;
  new_human: number;
  cumulative_nodes: number;
  cumulative_pct: number;
  fired_edges: number;
}

export interface InfluenceSeed {
  id: string;
  acct: string;
  followers: number;
  is_ia: boolean;
  direct_reached: number;
  efficiency: number;
  step: number;
}

export interface InfluenceTarget {
  id: string;
  acct: string;
  followers: number;
  is_ia: boolean;
  activation_step: number;
}

export interface InfluenceSummaryResponse {
  meta: InfluenceMeta;
  demographics: InfluenceDemographics;
  step_stats: InfluenceStepStat[];
  top_seeds: InfluenceSeed[];
  top_targets: InfluenceTarget[];
}

export interface InfluenceGraphNode {
  id: string;
  acct: string;
  followers: number;
  is_ia: boolean;
  is_seed: boolean;
  activation_step: number;
}

export interface InfluenceGraphLink {
  source: string;
  target: string;
  p_ic: number;
  step: number;
}

export interface InfluenceGraphResponse {
  nodes: InfluenceGraphNode[];
  links: InfluenceGraphLink[];
}

export interface InfluenceSeedsResponse {
  seeds: InfluenceSeed[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface InfluenceNodesResponse {
  nodes: InfluenceGraphNode[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface InfluenceAlgorithmInfo {
  n_seeds: number;
  est_spread: number | null;
  mc_spread: number;
  /**
   * null quando il backend non ha registrato il tempo per questa run:
   * `webapp/influence.py` legge il campo con `algo_info.get("time_s")`, senza
   * un valore di ripiego, quindi un dato mancante nella sorgente arriva qui
   * come null e non deve mai essere confuso con un tempo prossimo a zero.
   */
  time_s: number | null;
  seeds_sample: string[];
}

/** Parametri con cui e' stata eseguita la run di confronto. */
export interface ParametriRun {
  n_sub: number;
  k: number;
  theta: number;
  num_rr: number;
  mc_runs_celf: number;
  eval_runs: number;
  snowball_starts: number;
  random_seed: number;
  ic_p0: number;
  ic_cap: number;
  ic_method: string;
}

export interface InfluenceComparisonResponse {
  subgraph: {
    nodes: number;
    edges: number;
    candidates: number;
  };
  k: number;
  eval_runs: number;
  algorithms: Record<string, InfluenceAlgorithmInfo>;
  seed_overlap_jaccard: Record<string, number>;
  winner_by_mc_spread: string;
  /** null per le run che non hanno registrato i propri parametri. */
  params: ParametriRun | null;
}

export interface MisinfoGruppoStats {
  n: number;
  mean?: number;
  median?: number;
  std?: number;
  p25?: number;
  p75?: number;
}

export interface MisinfoSummaryResponse {
  topic: string;
  partial: boolean;
  total_posts: number;
  groups: Record<string, MisinfoGruppoStats>;
}

export interface MisinfoGroupEntry {
  n_sims?: number;
  n_seeds?: number;
  spread_mean?: number;
  spread_median?: number;
  spread_std?: number;
  spread_p25?: number;
  spread_p75?: number;
  spread_max?: number;
  _note?: string;
}

export interface MisinfoGroupSummaryResponse {
  topic: string;
  has_topic_breakdown: boolean;
  groups: Record<string, MisinfoGroupEntry>;
}

export interface MisinfoBoostStats {
  n: number;
  mean?: number;
  median?: number;
  std?: number;
  max?: number;
  boosted_pct?: number;
  boosted_n?: number;
}

export interface MisinfoBoostSummaryResponse {
  topic: string;
  groups: Record<string, MisinfoBoostStats>;
}

export const api = {
  dashboard: () => getJson<DashboardStats>("/api/dashboard", dashboardSchema),
  graph: (limit?: number, mode?: string) => getJson<GraphData>(`/api/graph${buildQuery({ limit, mode })}`),
  accountGraph: (accountId: number, limit?: number) =>
    getJson<GraphData>(`/api/graph/account/${accountId}${buildQuery({ limit })}`),
  searchAccounts: (q: string) =>
    getJson<{ accounts: AccountSearchResult[] }>(`/api/accounts/search${buildQuery({ q })}`),
  accountDetail: (id: number) =>
    getJson<AccountDetailResponse>(`/api/accounts/${id}/detail`),
  // Un oggetto invece di sei posizionali: i filtri sono cresciuti da uno a
  // cinque, e `api.posts(["it"], 1, 10, "", "bot", "recenti")` non si legge.
  posts: ({ lang, page = 1, pageSize = 25, search, author, order }: FiltriPost = {}) =>
    getJson<PostsResponse>(
      `/api/posts${buildQuery({
        lang,
        page,
        page_size: pageSize,
        q: search || undefined,
        author: author && author !== "tutti" ? author : undefined,
        order: order && order !== "archivio" ? order : undefined,
      })}`,
    ),
  postDetail: (id: number) => getJson<PostDetailResponse>(`/api/posts/${id}`),
  corpus: () => getJson<CorpusResponse>("/api/corpus", corpusSchema),
  accounts: () => getJson<AccountsStats>("/api/accounts", accountsStatsSchema),
  aiDetection: (probBucket: string[], page: number, sortBy: string = "id", detector: string = "fastdetect") =>
    getJson<AiDetectionResponse>(`/api/ai-detection${buildQuery({ detector, prob_bucket: probBucket, page, sort_by: sortBy })}`),

  detectorComparisonSummary: () =>
    getJson<DetectorComparisonSummaryResponse>("/api/detector-comparison/summary", detectorComparisonSummarySchema),
  detectorComparisonPosts: (filterType: string, page: number, pageSize: number = 25, search: string = "") =>
    getJson<DetectorComparisonPostsResponse>(`/api/detector-comparison/posts${buildQuery({ filter_type: filterType, page, page_size: pageSize, search })}`),

  factCheck: (verdict: string[], page: number, search: string = "") =>
    getJson<FactCheckResponse>(`/api/fact-check${buildQuery({ verdict, page, search })}`, factCheckSchema),

  pipelines: () => getJson<PipelinesResponse>("/api/pipelines"),
  dbSync: () => getJson<DbSyncResponse>("/api/db-sync"),
  pipelineStart: (name: string, param: string) =>
    postJson<JobActionResponse>(`/api/pipelines/${name}/start`, new URLSearchParams({ param })),
  pipelineStop: (name: string) =>
    postJson<JobActionResponse>(`/api/pipelines/${name}/stop`, new URLSearchParams()),
  dbImport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return postJson<JobActionResponse>("/api/db-sync/import", form);
  },

  influenceSummary: () => getJson<InfluenceSummaryResponse>("/api/influence-maximization/summary", influenceSummarySchema),
  influenceGraph: (seedId?: string) =>
    getJson<InfluenceGraphResponse>(`/api/influence-maximization/graph${buildQuery({ seed_id: seedId })}`),
  influenceSeeds: (page: number, pageSize: number = 25, search: string = "") =>

    getJson<InfluenceSeedsResponse>(`/api/influence-maximization/seeds${buildQuery({ page, page_size: pageSize, search })}`),
  influenceNodes: (page: number, pageSize: number = 25, search: string = "", step?: number, type: string = "all") =>
    getJson<InfluenceNodesResponse>(`/api/influence-maximization/nodes${buildQuery({ page, page_size: pageSize, search, step, type })}`),
  influenceComparison: () =>
    getJson<InfluenceComparisonResponse>("/api/influence-maximization/comparison"),

  misinfoTopics: () =>
    getJson<{ topics: string[] }>("/api/misinformation-impact/topics"),
  misinfoSummary: (topic: string = "generale") =>
    getJson<MisinfoSummaryResponse>(`/api/misinformation-impact/summary${buildQuery({ topic })}`),
  misinfoGroupSummary: (topic: string = "generale") =>
    getJson<MisinfoGroupSummaryResponse>(`/api/misinformation-impact/group-summary${buildQuery({ topic })}`),
  misinfoBoostSummary: (topic: string = "generale") =>
    getJson<MisinfoBoostSummaryResponse>(`/api/misinformation-impact/boost-summary${buildQuery({ topic })}`),
};





