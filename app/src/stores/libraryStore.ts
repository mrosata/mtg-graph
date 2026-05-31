// app/src/stores/libraryStore.ts
import { create } from 'zustand';
import { db, type LibraryRow } from '../lib/db';
import type { LibraryImportResult, ImportRowSummary } from '../lib/libraryImport';

export type LibraryMeta = {
  importedAt: number;
  sourceFilename: string;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

type LibraryState = {
  owned: Map<string, number> | null;
  enabled: boolean;
  meta: LibraryMeta | null;
  hydrate: () => Promise<void>;
  importLibrary: (result: LibraryImportResult, sourceFilename: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  setEnabled: (b: boolean) => Promise<void>;
};

function rowToState(row: LibraryRow): { owned: Map<string, number>; meta: LibraryMeta } {
  return {
    owned: new Map(Object.entries(row.owned)),
    meta: {
      importedAt: row.importedAt,
      sourceFilename: row.sourceFilename,
      unknownNames: row.unknownNames,
      unknownSets: row.unknownSets,
      unparseableLines: row.unparseableLines,
    },
  };
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  owned: null,
  enabled: false,
  meta: null,

  hydrate: async () => {
    const [row, prefs] = await Promise.all([db.library.get('main'), db.prefs.get('main')]);
    if (row) {
      const { owned, meta } = rowToState(row);
      set({ owned, meta, enabled: prefs?.libraryEnabled ?? true });
    } else {
      set({ owned: null, meta: null, enabled: prefs?.libraryEnabled ?? false });
    }
  },

  importLibrary: async (result, sourceFilename) => {
    const importedAt = Date.now();
    const ownedObj: Record<string, number> = {};
    for (const [k, v] of result.owned) ownedObj[k] = v;
    const row: LibraryRow = {
      id: 'main',
      importedAt,
      sourceFilename,
      owned: ownedObj,
      unknownNames: result.unknownNames,
      unknownSets: result.unknownSets,
      unparseableLines: result.unparseableLines,
    };

    // First-ever import auto-enables; re-imports preserve user's toggle state.
    const existingPrefs = await db.prefs.get('main');
    const isFirstImport = existingPrefs === undefined;

    await db.transaction('rw', db.library, db.prefs, async () => {
      await db.library.put(row);
      if (isFirstImport) {
        await db.prefs.put({ id: 'main', libraryEnabled: true });
      }
    });

    set({
      owned: new Map(result.owned),
      meta: {
        importedAt, sourceFilename,
        unknownNames: result.unknownNames,
        unknownSets: result.unknownSets,
        unparseableLines: result.unparseableLines,
      },
      enabled: isFirstImport ? true : get().enabled,
    });
  },

  clearLibrary: async () => {
    await db.transaction('rw', db.library, db.prefs, async () => {
      await db.library.delete('main');
      await db.prefs.put({ id: 'main', libraryEnabled: false });
    });
    set({ owned: null, meta: null, enabled: false });
  },

  setEnabled: async (b) => {
    await db.prefs.put({ id: 'main', libraryEnabled: b });
    set({ enabled: b });
  },
}));
