import type { Card } from '@shared/types';

export type ArenaIdEntry = {
  oracleId: string;
  set: string;
  collectorNumber: string;
};

export function buildArenaIdIndex(cards: Map<string, Card>): Map<number, ArenaIdEntry> {
  const out = new Map<number, ArenaIdEntry>();
  for (const card of cards.values()) {
    const details = card.printingDetails;
    if (!details) continue;
    for (const d of details) {
      if (d.arenaId === undefined) continue;
      out.set(d.arenaId, {
        oracleId: card.oracleId,
        set: d.set,
        collectorNumber: d.collectorNumber,
      });
    }
  }
  return out;
}
