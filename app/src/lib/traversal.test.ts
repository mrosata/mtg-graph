import { describe, it, expect } from 'vitest';
import { getNeighbors, type Neighbor } from './traversal';
import type { InteractionEdge } from '@shared/types';

const edges: InteractionEdge[] = [
  { source: 'A', target: 'B', reason: { sourceTagId: 'effect.create_token', targetTagId: 'trigger.creature_etb', direction: 'source_produces_for_target' } },
  { source: 'A', target: 'C', reason: { sourceTagId: 'effect.create_token', targetTagId: 'trigger.token_created', direction: 'source_produces_for_target' } },
  { source: 'B', target: 'A', reason: { sourceTagId: 'effect.reanimate', targetTagId: 'trigger.creature_etb', direction: 'source_produces_for_target' } },
];

const outbound = new Map<string, InteractionEdge[]>();
const inbound = new Map<string, InteractionEdge[]>();
for (const e of edges) {
  outbound.set(e.source, [...(outbound.get(e.source) ?? []), e]);
  inbound.set(e.target, [...(inbound.get(e.target) ?? []), e]);
}

describe('getNeighbors', () => {
  it('returns deduped neighbors with both outbound and inbound reasons', () => {
    const neighbors = getNeighbors('A', outbound, inbound);
    const byId = new Map(neighbors.map((n) => [n.oracleId, n]));
    expect(byId.size).toBe(2); // B and C

    const b = byId.get('B')!;
    expect(b.reasons).toHaveLength(2); // A→B and B→A
    expect(b.reasons.map((r) => r.direction).sort()).toEqual(['inbound', 'outbound']);

    const c = byId.get('C')!;
    expect(c.reasons).toHaveLength(1);
    expect(c.reasons[0]?.direction).toBe('outbound');
  });

  it('returns empty array when card has no edges', () => {
    expect(getNeighbors('Z', outbound, inbound)).toEqual([]);
  });
});
