import type { Card } from '@shared/types';
import type { OwnedPrinting } from './db';
import type { LibraryImportResult } from './libraryImport';
import { buildArenaIdIndex, type ArenaIdEntry } from './arenaIdIndex';
import type { MtgaRawDeck } from './mtgaLogParser';

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

export type ParsedMtgaDeck = {
  mtgaId: string;
  mtgaName: string;
  mtgaFormat: string;
  mainboard: { oracleId: string; count: number }[];
  sideboard: { oracleId: string; count: number }[];
  companion: { oracleId: string } | null;
  unresolvedMain: number;
  unresolvedSide: number;
  inPoolPercent: number;
};

export function resolveMtgaDecks(
  rawDecks: MtgaRawDeck[],
  cards: Map<string, Card>,
): ParsedMtgaDeck[] {
  const index = buildArenaIdIndex(cards);
  return rawDecks.map((d) => resolveOneDeck(d, index));
}

function resolveOneDeck(d: MtgaRawDeck, index: Map<number, ArenaIdEntry>): ParsedMtgaDeck {
  const mainboard: { oracleId: string; count: number }[] = [];
  const sideboard: { oracleId: string; count: number }[] = [];
  let resolved = 0;
  let totalCards = 0;
  let unresolvedMain = 0;
  let unresolvedSide = 0;

  for (const e of d.mainDeck) {
    totalCards += e.quantity;
    const hit = index.get(e.id);
    if (hit) { mainboard.push({ oracleId: hit.oracleId, count: e.quantity }); resolved += e.quantity; }
    else unresolvedMain += e.quantity;
  }
  for (const e of d.sideboard) {
    totalCards += e.quantity;
    const hit = index.get(e.id);
    if (hit) { sideboard.push({ oracleId: hit.oracleId, count: e.quantity }); resolved += e.quantity; }
    else unresolvedSide += e.quantity;
  }

  let companion: { oracleId: string } | null = null;
  if (d.companion) {
    const hit = index.get(d.companion.id);
    if (hit) companion = { oracleId: hit.oracleId };
  }

  return {
    mtgaId: d.id, mtgaName: d.name, mtgaFormat: d.format,
    mainboard, sideboard, companion,
    unresolvedMain, unresolvedSide,
    inPoolPercent: totalCards === 0 ? 0 : Math.round((resolved / totalCards) * 100),
  };
}
