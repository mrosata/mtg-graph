import type { Card, Color } from '@shared/types';
import type { Deck } from './db';

export const TYPE_ORDER = [
  'Creature',
  'Planeswalker',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Battle',
  'Land',
] as const;

export type DeckType = (typeof TYPE_ORDER)[number];

export const TYPE_PLURAL: Record<DeckType, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Battle: 'Battles',
  Land: 'Lands',
};

function primaryType(card: Card): DeckType | null {
  for (const t of TYPE_ORDER) {
    if (card.types.includes(t)) return t;
  }
  return null;
}

export function typeCounts(
  deck: Deck,
  cards: Map<string, Card>,
): Partial<Record<DeckType, number>> {
  const out: Partial<Record<DeckType, number>> = {};
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    const t = primaryType(card);
    if (!t) continue;
    out[t] = (out[t] ?? 0) + entry.count;
  }
  return out;
}

export function manaCurveBuckets(
  deck: Deck,
  cards: Map<string, Card>,
): number[] {
  const buckets = new Array(8).fill(0);
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (card.types.includes('Land')) continue;
    const idx = Math.min(7, card.cmc);
    buckets[idx] += entry.count;
  }
  return buckets;
}

const WUBRG: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];
const WUBRG_LOWER = WUBRG.map((c) => c.toLowerCase());

function pipContribution(symbol: string): Partial<Record<Color, number>> {
  const s = symbol.toLowerCase();
  if (WUBRG_LOWER.includes(s)) {
    return { [s.toUpperCase() as Color]: 1 };
  }
  if (/^[wubrg]\/p$/.test(s)) {
    const c = (s[0] as string).toUpperCase() as Color;
    return { [c]: 1 };
  }
  if (/^2\/[wubrg]$/.test(s)) {
    const c = (s[2] as string).toUpperCase() as Color;
    return { [c]: 0.5 };
  }
  if (/^[wubrg]\/[wubrg]$/.test(s)) {
    const a = (s[0] as string).toUpperCase() as Color;
    const b = (s[2] as string).toUpperCase() as Color;
    return { [a]: 0.5, [b]: 0.5 };
  }
  return {};
}

export function colorPipDistribution(
  deck: Deck,
  cards: Map<string, Card>,
): Record<Color, number> {
  const out: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (card.types.includes('Land')) continue;
    if (!card.manaCost) continue;
    const tokens = card.manaCost.match(/\{[^}]+\}/g) ?? [];
    for (const token of tokens) {
      const inner = token.slice(1, -1);
      const contrib = pipContribution(inner);
      for (const c of WUBRG) {
        out[c] += (contrib[c] ?? 0) * entry.count;
      }
    }
  }
  return out;
}
