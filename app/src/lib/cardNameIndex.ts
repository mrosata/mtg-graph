import type { Card } from '@shared/types';

export type NameLookupEntry = { oracleId: string; canonicalName: string };
export type CardNameLookup = {
  exact: Map<string, NameLookupEntry>;
  frontFace: Map<string, NameLookupEntry>;
  // Third-tier fallback for Scryfall `printed_name` / `flavor_name`. UB
  // crossover sets like `om1` canonicalize on the IP name (Superior
  // Spider-Man) but Arena/MTGO exports use the Magic-flavor name printed on
  // the card (Kavaero, Mind-Bitten). Looked up only after exact + frontFace.
  alternate: Map<string, NameLookupEntry>;
};

const DFC_SEPARATOR = ' // ';

export function buildCardNameLookup(cards: Map<string, Card>): CardNameLookup {
  const exact = new Map<string, NameLookupEntry>();
  const frontFace = new Map<string, NameLookupEntry>();
  const alternate = new Map<string, NameLookupEntry>();
  for (const card of cards.values()) {
    const entry: NameLookupEntry = { oracleId: card.oracleId, canonicalName: card.name };
    exact.set(card.name.toLowerCase(), entry);
    const sepIdx = card.name.indexOf(DFC_SEPARATOR);
    if (sepIdx !== -1) {
      const front = card.name.slice(0, sepIdx).toLowerCase();
      // First-write-wins; with zero name collisions in Standard this is defensive.
      if (!frontFace.has(front)) frontFace.set(front, entry);
    }
    for (const alt of [card.printedName, card.flavorName]) {
      if (!alt) continue;
      const key = alt.toLowerCase();
      if (!alternate.has(key)) alternate.set(key, entry);
    }
  }
  return { exact, frontFace, alternate };
}

export function lookupByName(lk: CardNameLookup, name: string): NameLookupEntry | undefined {
  const lower = name.toLowerCase();
  return lk.exact.get(lower) ?? lk.frontFace.get(lower) ?? lk.alternate.get(lower);
}
