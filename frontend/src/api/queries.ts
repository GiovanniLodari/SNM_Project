import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.ts";

/**
 * Custom TanStack Query Hooks per SNM.Intelligence.
 * Forniscono caching intelligente in memoria (5 minuti staleTime), re-fetching
 * automatico in background e deduplicazione delle chiamate API.
 */

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  posts: (lang: string[], page: number, pageSize: number) => ["posts", { lang, page, pageSize }] as const,
  postDetail: (id: number) => ["posts", "detail", id] as const,
  accounts: ["accounts"] as const,
  aiDetection: (probBucket: string[], page: number, sortBy: string, detector: string) =>
    ["ai-detection", { probBucket, page, sortBy, detector }] as const,
  detectorComparisonSummary: ["detector-comparison", "summary"] as const,
  detectorComparisonPosts: (filterType: string, page: number, pageSize: number, search: string) =>
    ["detector-comparison", "posts", { filterType, page, pageSize, search }] as const,
  factCheck: (verdict: string[], page: number, search: string) =>
    ["fact-check", { verdict, page, search }] as const,
  pipelines: ["pipelines"] as const,
  dbSync: ["db-sync"] as const,
  influenceSummary: ["influence", "summary"] as const,
  influenceGraph: (seedId?: string) => ["influence", "graph", seedId] as const,
  influenceSeeds: (page: number, pageSize: number, search: string) =>
    ["influence", "seeds", { page, pageSize, search }] as const,
  influenceNodes: (page: number, pageSize: number, search: string, step?: number, type?: string) =>
    ["influence", "nodes", { page, pageSize, search, step, type }] as const,
  influenceComparison: ["influence", "comparison"] as const,
};

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.dashboard(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostsQuery(lang: string[], page: number, pageSize: number = 25) {
  return useQuery({
    queryKey: queryKeys.posts(lang, page, pageSize),
    queryFn: () => api.posts(lang, page, pageSize),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostDetailQuery(id: number) {
  return useQuery({
    queryKey: queryKeys.postDetail(id),
    queryFn: () => api.postDetail(id),
    enabled: !!id && !isNaN(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.accounts(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiDetectionQuery(probBucket: string[], page: number, sortBy: string = "id", detector: string = "fastdetect") {
  return useQuery({
    queryKey: queryKeys.aiDetection(probBucket, page, sortBy, detector),
    queryFn: () => api.aiDetection(probBucket, page, sortBy, detector),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetectorComparisonSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.detectorComparisonSummary,
    queryFn: () => api.detectorComparisonSummary(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDetectorComparisonPostsQuery(filterType: string, page: number, pageSize: number = 25, search: string = "") {
  return useQuery({
    queryKey: queryKeys.detectorComparisonPosts(filterType, page, pageSize, search),
    queryFn: () => api.detectorComparisonPosts(filterType, page, pageSize, search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFactCheckQuery(verdict: string[], page: number, search: string = "") {
  return useQuery({
    queryKey: queryKeys.factCheck(verdict, page, search),
    queryFn: () => api.factCheck(verdict, page, search),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelinesQuery() {
  return useQuery({
    queryKey: queryKeys.pipelines,
    queryFn: () => api.pipelines(),
    refetchInterval: 3000, // Auto-refetch per avanzamento log pipeline in tempo reale
  });
}

export function useDbSyncQuery() {
  return useQuery({
    queryKey: queryKeys.dbSync,
    queryFn: () => api.dbSync(),
    refetchInterval: 3000, // Auto-refetch durante export/import database
  });
}

export function useInfluenceSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.influenceSummary,
    queryFn: () => api.influenceSummary(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useInfluenceGraphQuery(seedId?: string) {
  return useQuery({
    queryKey: queryKeys.influenceGraph(seedId),
    queryFn: () => api.influenceGraph(seedId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useInfluenceSeedsQuery(page: number, pageSize: number = 25, search: string = "") {
  return useQuery({
    queryKey: queryKeys.influenceSeeds(page, pageSize, search),
    queryFn: () => api.influenceSeeds(page, pageSize, search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInfluenceComparisonQuery() {
  return useQuery({
    queryKey: queryKeys.influenceComparison,
    queryFn: () => api.influenceComparison(),
    staleTime: 15 * 60 * 1000,
  });
}

export function usePipelineStartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, param }: { name: string; param: string }) => api.pipelineStart(name, param),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines });
      queryClient.invalidateQueries({ queryKey: queryKeys.dbSync });
    },
  });
}

export function usePipelineStopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.pipelineStop(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines });
      queryClient.invalidateQueries({ queryKey: queryKeys.dbSync });
    },
  });
}
