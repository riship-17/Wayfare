import { create } from 'zustand';
import type { ListingFilters } from './queries';

interface UiState {
  /** Task keys unlocked by the last Emirates ID change, for the unlock animation */
  justUnlocked: string[];
  setJustUnlocked: (keys: string[]) => void;
  pendingSync: number;
  setPendingSync: (n: number) => void;
  housingFilters: ListingFilters;
  setHousingFilters: (f: ListingFilters) => void;
}

export const useUi = create<UiState>((set) => ({
  justUnlocked: [],
  setJustUnlocked: (justUnlocked) => set({ justUnlocked }),
  pendingSync: 0,
  setPendingSync: (pendingSync) => set({ pendingSync }),
  housingFilters: {},
  setHousingFilters: (housingFilters) => set({ housingFilters }),
}));
