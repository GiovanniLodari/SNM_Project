import { create } from "zustand";

interface AppState {
  activeInfluenceTab: number;
  setActiveInfluenceTab: (tab: number) => void;
  selectedSeedId: string;
  setSelectedSeedId: (seedId: string) => void;
  selectedDetectorTab: string;
  setSelectedDetectorTab: (tab: string) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
}

/**
 * Store Zustand globale per la gestione dello stato UI ad alte prestazioni
 * senza re-render superflui dell'intera alberatura componenti.
 */
export const useAppStore = create<AppState>((set) => ({
  activeInfluenceTab: 0,
  setActiveInfluenceTab: (activeInfluenceTab) => set({ activeInfluenceTab }),
  selectedSeedId: "66109",
  setSelectedSeedId: (selectedSeedId) => set({ selectedSeedId }),
  selectedDetectorTab: "all",
  setSelectedDetectorTab: (selectedDetectorTab) => set({ selectedDetectorTab }),
  globalSearchQuery: "",
  setGlobalSearchQuery: (globalSearchQuery) => set({ globalSearchQuery }),
}));
