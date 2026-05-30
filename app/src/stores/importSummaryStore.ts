import { create } from 'zustand';
import type { ImportResult } from '../lib/deckImport';

type ImportSummaryState = {
  result: ImportResult | null;
  set: (result: ImportResult) => void;
  clear: () => void;
};

export const useImportSummaryStore = create<ImportSummaryState>((set) => ({
  result: null,
  set: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
