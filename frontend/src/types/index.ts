export interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  bot?: boolean;
  bot_score?: number;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  created_at: string;
  avatar?: string;
  header?: string;
  note?: string;
  url?: string;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  account?: Account;
  ai_score?: number;
  fact_check_score?: number;
  fact_check_status?: string;
  replies_count?: number;
  reblogs_count?: number;
  favourites_count?: number;
  url?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  username: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  bot_score?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface PipelineStatus {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
  last_run?: string;
}

export interface SyncStatus {
  total_accounts: number;
  total_posts: number;
  last_sync: string;
  is_syncing: boolean;
}
