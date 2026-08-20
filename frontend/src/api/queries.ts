import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, type FiltriPost } from "./client.ts";

/**
 * Custom TanStack Query Hooks per SNM.Intelligence.
 * Forniscono caching intelligente in memoria (5 minuti staleTime), re-fetching
 * automatico in background e deduplicazione delle chiamate API.
 */

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  // Tutti i filtri entrano nella chiave: due viste filtrate diversamente sono
  // due elenchi diversi, e condividere la cache mostrerebbe i post di una
  // ricerca sotto i filtri di un'altra.
  postsInfinite: (filtri: FiltriPost) => ["posts", "infinite", filtri] as const,
  postDetail: (id: number) => ["posts", "detail", id] as const,
  corpus: ["corpus"] as const,
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

/**
 * L'archivio dei post caricato per blocchi successivi invece che a pagine.
 *
 * Con la paginazione ogni clic sostituiva l'elenco e costringeva ad aspettare
 * la risposta prima di poter leggere ancora: scorrere il corpus - che e' il
 * compito del capitolo - voleva dire fermarsi ogni dieci post. Qui i blocchi si
 * accumulano, quindi quanto e' gia' arrivato resta a schermo e leggibile mentre
 * il successivo e' in volo.
 *
 * `getNextPageParam` si basa su `has_next` che il backend calcola gia': non si
 * deduce la fine dell'elenco dal numero di elementi ricevuti, che sarebbe
 * sbagliato quando l'ultimo blocco e' esattamente pieno.
 */
export function usePostsInfiniteQuery(filtri: FiltriPost) {
  return useInfiniteQuery({
    queryKey: queryKeys.postsInfinite(filtri),
    queryFn: ({ pageParam }) => api.posts({ ...filtri, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultimoBlocco, blocchi) =>
      ultimoBlocco.has_next ? blocchi.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCorpusQuery() {
  return useQuery({
    queryKey: queryKeys.corpus,
    queryFn: () => api.corpus(),
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

export function useMisinfoTopicsQuery() {
  return useQuery({
    queryKey: ["misinfo", "topics"],
    queryFn: () => api.misinfoTopics(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useMisinfoSummaryQuery(topic: string) {
  return useQuery({
    queryKey: ["misinfo", "summary", topic],
    queryFn: () => api.misinfoSummary(topic),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useMisinfoGroupSummaryQuery(topic: string) {
  return useQuery({
    queryKey: ["misinfo", "group-summary", topic],
    queryFn: () => api.misinfoGroupSummary(topic),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useMisinfoBoostSummaryQuery(topic: string) {
  return useQuery({
    queryKey: ["misinfo", "boost-summary", topic],
    queryFn: () => api.misinfoBoostSummary(topic),
    staleTime: 10 * 60 * 1000,
    retry: false,
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

/**
 * Pre-carica i dati delle query principali per una rotta al passaggio del mouse
 * o focus sul link di navigazione.
 */
export function prefetchRouteData(queryClient: QueryClient, path: string) {
  const staleTime = 5 * 60 * 1000;
  if (path === "/") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard,
      queryFn: () => api.dashboard(),
      staleTime,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.aiDetection([], 1, "id", "fastdetect"),
      queryFn: () => api.aiDetection([], 1, "id", "fastdetect"),
      staleTime,
    });
  } else if (path === "/posts") {
    // `prefetchInfiniteQuery` e non `prefetchQuery`: la chiave e la forma dei
    // dati di una query a blocchi sono diverse, e riempirla con una risposta
    // singola lascerebbe la cache inutilizzabile - la pagina rifarebbe comunque
    // la richiesta, e il prefetch sarebbe solo traffico sprecato.
    // I filtri sono quelli predefiniti di Posts: con altri nella URL la chiave
    // non combacia e il prefetch semplicemente non serve.
    const filtriIniziali: FiltriPost = { lang: [], pageSize: 10, search: "", author: "tutti", order: "archivio" };
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.postsInfinite(filtriIniziali),
      queryFn: () => api.posts({ ...filtriIniziali, page: 1 }),
      initialPageParam: 1,
      staleTime,
    });
    // La composizione del corpus apre la pagina: e' la prima cosa che si vede,
    // quindi vale la pena averla gia' pronta.
    queryClient.prefetchQuery({
      queryKey: queryKeys.corpus,
      queryFn: () => api.corpus(),
      staleTime,
    });
  } else if (path === "/detection") {
    // Il capitolo apre sul modello predefinito e chiude sul confronto: si
    // pre-caricano entrambi, perche' l'atto III e' raggiungibile scorrendo
    // senza altra navigazione che potrebbe innescare un secondo prefetch.
    queryClient.prefetchQuery({
      queryKey: queryKeys.aiDetection([], 1, "id", "fastdetect"),
      queryFn: () => api.aiDetection([], 1, "id", "fastdetect"),
      staleTime,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.detectorComparisonSummary,
      queryFn: () => api.detectorComparisonSummary(),
      staleTime,
    });
  } else if (path === "/fact-check") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.factCheck([], 1, ""),
      queryFn: () => api.factCheck([], 1, ""),
      staleTime,
    });
  } else if (path === "/accounts") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.accounts,
      queryFn: () => api.accounts(),
      staleTime,
    });
  } else if (path === "/influence-maximization") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.influenceSummary,
      queryFn: () => api.influenceSummary(),
      staleTime: 10 * 60 * 1000,
    });
  } else if (path === "/pipelines") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.pipelines,
      queryFn: () => api.pipelines(),
    });
  } else if (path === "/db-sync") {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dbSync,
      queryFn: () => api.dbSync(),
    });
  }
}
