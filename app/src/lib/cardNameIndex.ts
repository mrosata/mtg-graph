import type { Card } from '@shared/types';

export type NameLookupEntry = { oracleId: string; canonicalName: string };
export type CardNameLookup = {
  exact: Map<string, NameLookupEntry>;
  frontFace: Map<string, NameLookupEntry>;
};

const DFC_SEPARATOR = ' // ';

export function buildCardNameLookup(cards: Map<string, Card>): CardNameLookup {
  const exact = new Map<string, NameLookupEntry>();
  const frontFace = new Map<string, NameLookupEntry>();
  for (const card of cards.values()) {
    const lower = card.name.toLowerCase();
    exact.set(lower, { oracleId: card.oracleId, canonicalName: card.name });
    const sepIdx = card.name.indexOf(DFC_SEPARATOR);
    if (sepIdx !== -1) {
      const front = card.name.slice(0, sepIdx).toLowerCase();
      // First-write-wins; with zero name collisions in Standard this is defensive.
      if (!frontFace.has(front)) {
        frontFace.set(front, { oracleId: card.oracleId, canonicalName: card.name });
      }
    }
  }
  return { exact, frontFace };
}

export function lookupByName(lk: CardNameLookup, name: string): NameLookupEntry | undefined {
  const lower = name.toLowerCase();
  return lk.exact.get(lower) ?? lk.frontFace.get(lower);
}
