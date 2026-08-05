export interface Post {
  id: number;
  language: string | null;
  content: string;
  created_at: string | null;
  acct: string;
  bot: boolean;
  domain: string;
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
  confidence: number | null;
  reasoning: string;
  evidence?: any;
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
  fact_check: FactCheck | null;
}

export interface AccountsStats {
  bot_total: number;
  nonbot_total: number;
  ai_producers_total: number;
  ai_and_bot: number;
  ai_and_not_bot: number;
}

export interface AiDetectionResponse {
  done: number;
  eligible: number;
  ai_classified: number;
  ai_threshold: number;
  histogram: Record<string, number>;
  bucket_samples?: Record<string, { post: Post; probability: number }[]>;
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

export const api = {
  dashboard: () => getJson<DashboardStats>("/api/dashboard"),
  graph: (limit?: number, mode?: string) => getJson<GraphData>(`/api/graph${buildQuery({ limit, mode })}`),
  accountGraph: (accountId: number, limit?: number) =>
    getJson<GraphData>(`/api/graph/account/${accountId}${buildQuery({ limit })}`),
  searchAccounts: (q: string) =>
    getJson<{ accounts: AccountSearchResult[] }>(`/api/accounts/search${buildQuery({ q })}`),
  accountDetail: (id: number) =>
    getJson<AccountDetailResponse>(`/api/accounts/${id}/detail`),
  posts: (lang: string[], page: number) =>
    getJson<PostsResponse>(`/api/posts${buildQuery({ lang, page })}`),
  postDetail: (id: number) => getJson<PostDetailResponse>(`/api/posts/${id}`),
  accounts: () => getJson<AccountsStats>("/api/accounts"),
  aiDetection: (probBucket: string[], page: number, sortBy: string = "id") =>
    getJson<AiDetectionResponse>(`/api/ai-detection${buildQuery({ prob_bucket: probBucket, page, sort_by: sortBy })}`),

  factCheck: (verdict: string[], page: number) =>
    getJson<FactCheckResponse>(`/api/fact-check${buildQuery({ verdict, page })}`),
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


