import type { Card } from '@shared/types';
import type { OwnedPrinting } from './db';
import type { LibraryImportResult } from './libraryImport';
import { buildArenaIdIndex, type ArenaIdEntry } from './arenaIdIndex';

export type MtgaCollectionSummary = {
  totalCardsOwned: number;
  resolvedCardsOwned: number;
  outOfPoolCount: number;
  unresolvedArenaIds: number[];
};

export function resolveMtgaCollection(
  raw: Record<string, number>,
  cards: Map<string, Card>,
): { result: LibraryImportResult; mtgaSummary: MtgaCollectionSummary } {
  const index = buildArenaIdIndex(cards);
  return resolveMtgaCollectionWithIndex(raw, index);
}

export function resolveMtgaCollectionWithIndex(
  raw: Record<string, number>,
  index: Map<number, ArenaIdEntry>,
): { result: LibraryImportResult; mtgaSummary: MtgaCollectionSummary } {
  const owned = new Map<string, number>();
  const ownedDetail = new Map<string, OwnedPrinting[]>();
  let totalCardsOwned = 0;
  let resolvedCardsOwned = 0;
  const unresolvedArenaIds: number[] = [];

  for (const [arenaIdStr, countRaw] of Object.entries(raw)) {
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) continue;
    totalCardsOwned += count;

    const arenaId = Number(arenaIdStr);
    const entry = index.get(arenaId);
    if (!entry) {
      unresolvedArenaIds.push(arenaId);
      continue;
    }

    resolvedCardsOwned += count;
    owned.set(entry.oracleId, (owned.get(entry.oracleId) ?? 0) + count);

    const list = ownedDetail.get(entry.oracleId) ?? [];
    const existing = list.find(
      (p) => p.set.toLowerCase() === entry.set.toLowerCase() &&
             p.collectorNumber === entry.collectorNumber,
    );
    if (existing) existing.count += count;
    else list.push({ set: entry.set, collectorNumber: entry.collectorNumber, count });
    ownedDetail.set(entry.oracleId, list);
  }

  const result: LibraryImportResult = {
    owned, ownedDetail,
    unknownNames: [], unknownSets: [], unparseableLines: [],
  };
  const mtgaSummary: MtgaCollectionSummary = {
    totalCardsOwned,
    resolvedCardsOwned,
    outOfPoolCount: totalCardsOwned - resolvedCardsOwned,
    unresolvedArenaIds,
  };
  return { result, mtgaSummary };
}
