// app/src/lib/db.ts
import Dexie, { Table } from 'dexie';
import type { Artifact } from '@shared/types';
import type { ImportRowSummary } from './libraryImport';

// `mtgoId` is preserved from imports (DEK CatID) so it survives round-trip
// through our app back to MTGO/Archidekt. Entries added in-app leave it undefined
// and the exporter falls back to `Card.mtgoId` at write time.
export type DeckCard = { oracleId: string; count: number; name?: string; mtgoId?: number };

export type Deck = {
  id: string;
  name: string;
  format: 'standard';
  originalCards: DeckCard[];
  workingCards: DeckCard[];
  // Sideboard mirrors maindeck shape. Most consumers (stats, colors, themes,
  // graph traversal) ignore sideboard and operate on workingCards only.
  // Legality, deck diff, and exporters read both. Optional in the type so
  // pre-v5 fixtures continue to compile; the v5 migration backfills `[]`,
  // and `deckStore` always sets both when creating new decks.
  originalSideboardCards?: DeckCard[];
  sideboardCards?: DeckCard[];
  createdAt: number;
  updatedAt: number;
};

export type ArtifactCacheRow = {
  ruleVersion: string;
  sourceSet: string;
  fetchedAt: number;
  artifact: Artifact;
};

export type OwnedPrinting = {
  set: string;
  collectorNumber: string;
  mtgoId?: number;
  count: number;
};

export type OwnedEntry = {
  total: number;
  // Per-printing breakdown captured at import time. Undefined for entries
  // migrated from the v3 schema (we only knew the aggregate total then).
  printings?: OwnedPrinting[];
};

export type LibraryRow = {
  id: 'main';
  importedAt: number;
  sourceFilename: string;
  owned: Record<string, OwnedEntry>;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

export type PrefsRow = {
  id: 'main';
  libraryEnabled: boolean;
};

export class MtgDb extends Dexie {
  decks!: Table<Deck, string>;
  artifactCache!: Table<ArtifactCacheRow, string>;
  library!: Table<LibraryRow, 'main'>;
  prefs!: Table<PrefsRow, 'main'>;

  constructor(name = 'mtg-graph') {
    super(name);
    this.version(1).stores({
      decks: 'id, name, updatedAt',
      artifactCache: '&ruleVersion',
    });
    this.version(2)
      .stores({
        decks: 'id, name, updatedAt',
        artifactCache: '&ruleVersion',
      })
      .upgrade((tx) =>
        tx
          .table('decks')
          .toCollection()
          .modify((d: { cards?: DeckCard[]; originalCards?: DeckCard[]; workingCards?: DeckCard[] }) => {
            const baseline = d.cards ?? [];
            d.originalCards = baseline.map((c) => ({ ...c }));
            d.workingCards = baseline.map((c) => ({ ...c }));
            delete d.cards;
          }),
      );
    this.version(3).stores({
      decks: 'id, name, updatedAt',
      artifactCache: '&ruleVersion',
      library: 'id',
      prefs: 'id',
    });
    this.version(4)
      .stores({
        decks: 'id, name, updatedAt',
        artifactCache: '&ruleVersion',
        library: 'id',
        prefs: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('library')
          .toCollection()
          .modify((row: { owned?: Record<string, number | OwnedEntry> }) => {
            if (!row.owned) return;
            const next: Record<string, OwnedEntry> = {};
            for (const [k, v] of Object.entries(row.owned)) {
              next[k] = typeof v === 'number' ? { total: v } : v;
            }
            row.owned = next;
          }),
      );
    this.version(5)
      .stores({
        decks: 'id, name, updatedAt',
        artifactCache: '&ruleVersion',
        library: 'id',
        prefs: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('decks')
          .toCollection()
          .modify((d: { sideboardCards?: DeckCard[]; originalSideboardCards?: DeckCard[] }) => {
            if (!d.sideboardCards) d.sideboardCards = [];
            if (!d.originalSideboardCards) d.originalSideboardCards = [];
          }),
      );
  }
}

export function makeMtgDb(name = 'mtg-graph'): MtgDb {
  return new MtgDb(name);
}

export const db = makeMtgDb();
