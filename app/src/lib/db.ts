// app/src/lib/db.ts
import Dexie, { Table } from 'dexie';
import type { Artifact } from '@shared/types';
import type { ImportRowSummary } from './libraryImport';

export type DeckCard = { oracleId: string; count: number; name?: string };

export type Deck = {
  id: string;
  name: string;
  format: 'standard';
  originalCards: DeckCard[];
  workingCards: DeckCard[];
  createdAt: number;
  updatedAt: number;
};

export type ArtifactCacheRow = {
  ruleVersion: string;
  sourceSet: string;
  fetchedAt: number;
  artifact: Artifact;
};

export type LibraryRow = {
  id: 'main';
  importedAt: number;
  sourceFilename: string;
  owned: Record<string, number>;
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
  }
}

export function makeMtgDb(name = 'mtg-graph'): MtgDb {
  return new MtgDb(name);
}

export const db = makeMtgDb();
