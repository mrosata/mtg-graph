import type { Card } from '../shared/types';

export function mergeCardsAcrossSets(cards: Card[]): Card[] {
  const byOracle = new Map<string, Card>();
  for (const c of cards) {
    const existing = byOracle.get(c.oracleId);
    if (!existing) {
      byOracle.set(c.oracleId, {
        ...c,
        printings: [...c.printings],
        printingDetails: c.printingDetails ? c.printingDetails.map((d) => ({ ...d })) : undefined,
      });
      continue;
    }
    for (const p of c.printings) {
      if (!existing.printings.includes(p)) existing.printings.push(p);
    }
    if (c.printingDetails) {
      const details = existing.printingDetails ?? [];
      for (const d of c.printingDetails) {
        const dup = details.some((e) => e.set === d.set && e.collectorNumber === d.collectorNumber);
        if (!dup) details.push({ ...d });
      }
      existing.printingDetails = details;
    }
  }
  return Array.from(byOracle.values());
}
