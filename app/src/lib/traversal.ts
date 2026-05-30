import type { InteractionEdge } from '@shared/types';

export type NeighborReason = {
  direction: 'outbound' | 'inbound';
  sourceTagId: string;
  targetTagId: string;
};

export type Neighbor = {
  oracleId: string;
  reasons: NeighborReason[];
};

export function getNeighbors(
  oracleId: string,
  outbound: Map<string, InteractionEdge[]>,
  inbound: Map<string, InteractionEdge[]>,
): Neighbor[] {
  const byNeighbor = new Map<string, NeighborReason[]>();

  for (const e of outbound.get(oracleId) ?? []) {
    const list = byNeighbor.get(e.target) ?? [];
    list.push({ direction: 'outbound', sourceTagId: e.reason.sourceTagId, targetTagId: e.reason.targetTagId });
    byNeighbor.set(e.target, list);
  }
  for (const e of inbound.get(oracleId) ?? []) {
    const list = byNeighbor.get(e.source) ?? [];
    list.push({ direction: 'inbound', sourceTagId: e.reason.sourceTagId, targetTagId: e.reason.targetTagId });
    byNeighbor.set(e.source, list);
  }

  return Array.from(byNeighbor.entries()).map(([id, reasons]) => ({ oracleId: id, reasons }));
}
