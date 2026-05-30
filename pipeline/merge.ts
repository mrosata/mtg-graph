import type { Card } from '../shared/types';

export function mergeCardsAcrossSets(cards: Card[]): Card[] {
  const byOracle = new Map<string, Card>();
  for (const c of cards) {
    const existing = byOracle.get(c.oracleId);
    if (!existing) {
      byOracle.set(c.oracleId, { ...c, printings: [...c.printings] });
      continue;
    }
    for (const p of c.printings) {
      if (!existing.printings.includes(p)) existing.printings.push(p);
    }
  }
  return Array.from(byOracle.values());
}
