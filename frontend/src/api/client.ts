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
  evidence?: any;
  model?: string;
}


export interface FactCheckResponse {
  done: number;
  eligible: number;
  verdicts: Record<string, number>;
  page_rows: { post: Post; row: FactCheck }[];
  page: number;
  page_size: number;
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
  has_next: boolean;
}

export interface PostDetailResponse {
  post: Post | null;
  ai_score: AiScore | null;
  binoculars_score?: AiScore | null;
  desklib_score?: AiScore | null;
  ada_score?: AiScore | null;
  fact_check: FactCheck | null;
}

export interface AccountsStats {
  bot_total: number;
  nonbot_total: number;
  ai_producers_total: number;
  ai_and_bot: number;
  ai_and_not_bot: number;
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




export interface FactCheckResponse {
  done: number;
  eligible: number;
  verdicts: Record<string, number>;
  page_rows: { post: Post; row: FactCheck }[];
  page: number;
  page_size: number;
  has_next: boolean;
  verdict_options: string[];
  selected_verdicts: string[];
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Errore ${res.status} su ${url}`);
  return (await res.json()) as T;
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
  ai_percentage: number;
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
  bot_investigation?: {
    total_bot_statuses: number;
    total_human_statuses: number;
    models: {
      fastdetectgpt: { scored: number; ai_count: number; ai_percentage: number };
      binoculars: { scored: number; ai_count: number; ai_percentage: number };
      desklib: { scored: number; ai_count: number; ai_percentage: number };
      ada?: { scored: number; ai_count: number; ai_percentage: number };
    };
  };
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

export const api = {
  dashboard: () => getJson<DashboardStats>("/api/dashboard"),
  graph: (limit?: number, mode?: string) => getJson<GraphData>(`/api/graph${buildQuery({ limit, mode })}`),
  accountGraph: (accountId: number, limit?: number) =>
    getJson<GraphData>(`/api/graph/account/${accountId}${buildQuery({ limit })}`),
  searchAccounts: (q: string) =>
    getJson<{ accounts: AccountSearchResult[] }>(`/api/accounts/search${buildQuery({ q })}`),
  accountDetail: (id: number) =>
    getJson<AccountDetailResponse>(`/api/accounts/${id}/detail`),
  posts: (lang: string[], page: number, pageSize: number = 25) =>
    getJson<PostsResponse>(`/api/posts${buildQuery({ lang, page, page_size: pageSize })}`),
  postDetail: (id: number) => getJson<PostDetailResponse>(`/api/posts/${id}`),
  accounts: () => getJson<AccountsStats>("/api/accounts"),
  aiDetection: (probBucket: string[], page: number, sortBy: string = "id", detector: string = "fastdetect") =>
    getJson<AiDetectionResponse>(`/api/ai-detection${buildQuery({ detector, prob_bucket: probBucket, page, sort_by: sortBy })}`),


  detectorComparisonSummary: () =>
    getJson<DetectorComparisonSummaryResponse>("/api/detector-comparison/summary"),
  detectorComparisonPosts: (filterType: string, page: number, pageSize: number = 25, search: string = "") =>
    getJson<DetectorComparisonPostsResponse>(`/api/detector-comparison/posts${buildQuery({ filter_type: filterType, page, page_size: pageSize, search })}`),

  factCheck: (verdict: string[], page: number, search: string = "") =>
    getJson<FactCheckResponse>(`/api/fact-check${buildQuery({ verdict, page, search })}`),

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
};



