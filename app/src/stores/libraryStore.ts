// app/src/stores/libraryStore.ts
import { create } from 'zustand';
import { db, type LibraryRow, type OwnedPrinting } from '../lib/db';
import type { LibraryImportResult, ImportRowSummary } from '../lib/libraryImport';

export type LibraryMeta = {
  importedAt: number;
  sourceFilename: string;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

type LibraryState = {
  // Aggregate count per oracleId. UI consumers (DeckPanel, FilterPanel, etc.)
  // read this. Stays a flat Map for cheap lookup.
  owned: Map<string, number> | null;
  // Per-printing breakdown. Used by exporters that need to round-trip the
  // user's exact printing (DEK CatID). Null when the library has nothing
  // imported, or when it was migrated from a v3-era row that only knew totals.
  ownedDetail: Map<string, OwnedPrinting[]> | null;
  enabled: boolean;
  meta: LibraryMeta | null;
  hydrate: () => Promise<void>;
  importLibrary: (result: LibraryImportResult, sourceFilename: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  setEnabled: (b: boolean) => Promise<void>;
};

function rowToState(row: LibraryRow): {
  owned: Map<string, number>;
  ownedDetail: Map<string, OwnedPrinting[]> | null;
  meta: LibraryMeta;
} {
  const owned = new Map<string, number>();
  const detail = new Map<string, OwnedPrinting[]>();
  let anyDetail = false;
  for (const [oid, entry] of Object.entries(row.owned)) {
    owned.set(oid, entry.total);
    if (entry.printings && entry.printings.length > 0) {
      detail.set(oid, entry.printings);
      anyDetail = true;
    }
  }
  return {
    owned,
    ownedDetail: anyDetail ? detail : null,
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
  ownedDetail: null,
  enabled: false,
  meta: null,

  hydrate: async () => {
    const [row, prefs] = await Promise.all([db.library.get('main'), db.prefs.get('main')]);
    if (row) {
      const { owned, ownedDetail, meta } = rowToState(row);
      set({ owned, ownedDetail, meta, enabled: prefs?.libraryEnabled ?? true });
    } else {
      set({ owned: null, ownedDetail: null, meta: null, enabled: prefs?.libraryEnabled ?? false });
    }
  },

  importLibrary: async (result, sourceFilename) => {
    const importedAt = Date.now();
    const ownedObj: LibraryRow['owned'] = {};
    for (const [k, total] of result.owned) {
      const printings = result.ownedDetail.get(k);
      ownedObj[k] = printings && printings.length > 0 ? { total, printings } : { total };
    }
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
      ownedDetail: result.ownedDetail.size > 0 ? new Map(result.ownedDetail) : null,
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
    set({ owned: null, ownedDetail: null, meta: null, enabled: false });
  },

  setEnabled: async (b) => {
    set({ enabled: b });
    await db.prefs.put({ id: 'main', libraryEnabled: b });
  },
}));
