import type { Card, Color, InteractionEdge } from '@shared/types';
import { familyFor, type FamilyId } from './tagFamilies';

export const MAX_CANDIDATES = 50;
const WEIGHT_DIMINISH = 0.3;
const BREADTH_BONUS = 0.2;

export type ColorFilter = Color | 'C';

export type FilterState = {
  offFamilies: Set<FamilyId>;
  onColors: Set<ColorFilter>;
};

export type CandidateScoreInput = {
  candidate: Card;
  /** Map of `${idA}|${idB}` (sorted) → all edges between that pair. */
  edgesByPair: Map<string, InteractionEdge[]>;
  deckOracleIds: Set<string>;
  filters: FilterState;
};

function edgeFamily(e: InteractionEdge): FamilyId | undefined {
  // Use the source tag's family — pipeline pairings are family-coherent.
  return familyFor(e.reason.sourceTagId)?.id;
}

function colorAllowed(card: Card, onColors: Set<ColorFilter>): boolean {
  // Empty filter = no restriction (any color passes).
  if (onColors.size === 0) return true;
  // Colorless cards (empty colorIdentity) pass only if 'C' is toggled on.
  if (card.colorIdentity.length === 0) return onColors.has('C');
  // Otherwise the card's color identity must be a SUBSET of toggled-on colors.
  for (const c of card.colorIdentity) {
    if (!onColors.has(c)) return false;
  }
  return true;
}

export function scoreCandidate(input: CandidateScoreInput): number {
  const { candidate, edgesByPair, deckOracleIds, filters } = input;
  if (!colorAllowed(candidate, filters.onColors)) return 0;

  type FamilyAcc = { count: number; deckIds: Set<string> };
  const byFamily = new Map<FamilyId, FamilyAcc>();

  for (const [pairKey, edges] of edgesByPair) {
    const [a, b] = pairKey.split('|');
    if (a !== candidate.oracleId && b !== candidate.oracleId) continue;
    const deckId = a === candidate.oracleId ? b : a;
    if (!deckId || !deckOracleIds.has(deckId)) continue;

    for (const e of edges) {
      const fam = edgeFamily(e);
      if (!fam || filters.offFamilies.has(fam)) continue;
      const acc = byFamily.get(fam) ?? { count: 0, deckIds: new Set<string>() };
      acc.count += 1;
      acc.deckIds.add(deckId);
      byFamily.set(fam, acc);
    }
  }

  let total = 0;
  for (const { count, deckIds } of byFamily.values()) {
    const weight = 1 + WEIGHT_DIMINISH * (count - 1);
    const breadth = 1 + BREADTH_BONUS * (deckIds.size - 1);
    total += weight * breadth;
  }
  return total;
}

export type GraphNodeCls = 'deck' | 'candidate' | 'bridge';

export type GraphNode = {
  id: string;
  cls: GraphNodeCls;
  card: Card;
  radius: number;
  edgeCount: number;
};

export type FamilyBreakdownEntry = {
  familyId: FamilyId;
  count: number;
  score: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  dominantFamily: FamilyId;
  totalEdgeCount: number;
  weight: number;
  familyBreakdown: FamilyBreakdownEntry[];
  kind: 'base' | 'bridge';
};

export type GraphInput = {
  deckOracleIds: string[];
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export type GraphOutput = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function radiusFor(edgeCount: number): number {
  return 12 + Math.min(12, Math.sqrt(edgeCount) * 3);
}

export function buildDeckGraph(input: GraphInput): GraphOutput {
  const deckSet = new Set(input.deckOracleIds);

  // For each deck card, scan outbound + inbound edges; any neighbor not in
  // the deck set becomes a candidate (with all incident edges to the deck).
  const edgesByCandidate = new Map<string, Map<string, InteractionEdge[]>>();

  function addCandidateEdge(deckId: string, otherId: string, e: InteractionEdge) {
    if (deckSet.has(otherId)) return;
    if (!input.cards.has(otherId)) return;
    const pair = pairKey(otherId, deckId);
    const byPair = edgesByCandidate.get(otherId) ?? new Map<string, InteractionEdge[]>();
    const list = byPair.get(pair) ?? [];
    list.push(e);
    byPair.set(pair, list);
    edgesByCandidate.set(otherId, byPair);
  }

  for (const deckId of input.deckOracleIds) {
    for (const e of input.outbound.get(deckId) ?? []) {
      addCandidateEdge(deckId, e.target, e);
    }
    for (const e of input.inbound.get(deckId) ?? []) {
      addCandidateEdge(deckId, e.source, e);
    }
  }

  // Score and rank.
  type Scored = { candidateId: string; score: number };
  const scored: Scored[] = [];
  for (const [candId, byPair] of edgesByCandidate) {
    const card = input.cards.get(candId);
    if (!card) continue;
    const s = scoreCandidate({
      candidate: card,
      edgesByPair: byPair,
      deckOracleIds: deckSet,
      filters: input.filters,
    });
    if (s > 0) scored.push({ candidateId: candId, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, MAX_CANDIDATES).map((s) => s.candidateId);
  const topCandSet = new Set(topCandidates);

  // Build aggregated edges.
  type EdgeAcc = {
    pair: string;
    a: string;
    b: string;
    byFamily: Map<FamilyId, number>;
  };
  const edgeAccs = new Map<string, EdgeAcc>();

  function recordEdge(a: string, b: string, e: InteractionEdge) {
    const fam = familyFor(e.reason.sourceTagId)?.id;
    if (!fam) return;
    if (input.filters.offFamilies.has(fam)) return;
    const pk = pairKey(a, b);
    const acc = edgeAccs.get(pk) ?? { pair: pk, a, b, byFamily: new Map<FamilyId, number>() };
    acc.byFamily.set(fam, (acc.byFamily.get(fam) ?? 0) + 1);
    edgeAccs.set(pk, acc);
  }

  // deck↔deck edges
  for (const deckId of input.deckOracleIds) {
    for (const e of input.outbound.get(deckId) ?? []) {
      if (deckSet.has(e.target) && e.target !== deckId) {
        recordEdge(deckId, e.target, e);
      }
    }
  }
  // deck↔candidate edges (top candidates only)
  for (const candId of topCandidates) {
    const byPair = edgesByCandidate.get(candId);
    if (!byPair) continue;
    for (const [pk, edges] of byPair) {
      const [a, b] = pk.split('|');
      if (!a || !b) continue;
      const deckId = a === candId ? b : a;
      for (const e of edges) {
        const fam = familyFor(e.reason.sourceTagId)?.id;
        if (!fam || input.filters.offFamilies.has(fam)) continue;
        recordEdge(candId, deckId, e);
      }
    }
  }

  const edges: GraphEdge[] = [];
  for (const acc of edgeAccs.values()) {
    let dominantFamily: FamilyId | null = null;
    let dominantCount = -1;
    let totalCount = 0;
    const breakdown: FamilyBreakdownEntry[] = [];
    for (const [fam, count] of acc.byFamily) {
      totalCount += count;
      const famScore = 1 + WEIGHT_DIMINISH * (count - 1);
      breakdown.push({ familyId: fam, count, score: famScore });
      if (count > dominantCount) {
        dominantCount = count;
        dominantFamily = fam;
      }
    }
    if (!dominantFamily) continue;
    const weight = breakdown.reduce((s, b) => s + b.score, 0);
    edges.push({
      source: acc.a,
      target: acc.b,
      dominantFamily,
      totalEdgeCount: totalCount,
      weight,
      familyBreakdown: breakdown,
      kind: 'base',
    });
  }

  // Edge counts per node, for visual radius.
  const edgeCountById = new Map<string, number>();
  for (const e of edges) {
    edgeCountById.set(e.source, (edgeCountById.get(e.source) ?? 0) + 1);
    edgeCountById.set(e.target, (edgeCountById.get(e.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = [];
  for (const deckId of input.deckOracleIds) {
    const card = input.cards.get(deckId);
    if (!card) continue;
    const ec = edgeCountById.get(deckId) ?? 0;
    nodes.push({ id: deckId, cls: 'deck', card, radius: radiusFor(ec), edgeCount: ec });
  }
  for (const candId of topCandidates) {
    if (!topCandSet.has(candId)) continue;
    const card = input.cards.get(candId);
    if (!card) continue;
    const ec = edgeCountById.get(candId) ?? 0;
    nodes.push({ id: candId, cls: 'candidate', card, radius: radiusFor(ec), edgeCount: ec });
  }

  return { nodes, edges };
}

export type FocusInput = {
  focusOracleId: string;
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export type NeighborStat = {
  oracleId: string;
  card: Card;
  weight: number;
  totalEdgeCount: number;
  familyBreakdown: FamilyBreakdownEntry[];
  deckCount: number;
  inDeck: boolean;
  cls?: GraphNodeCls;
};

export function neighborStats(
  selectedId: string,
  incidentEdges: GraphEdge[],
  cards: Map<string, Card>,
  deckCounts: Map<string, number>,
  nodesById?: Map<string, GraphNode>,
): NeighborStat[] {
  const out: NeighborStat[] = [];
  for (const e of incidentEdges) {
    const neighborId = e.source === selectedId ? e.target : e.source;
    const card = cards.get(neighborId);
    if (!card) continue;
    const deckCount = deckCounts.get(neighborId) ?? 0;
    out.push({
      oracleId: neighborId,
      card,
      weight: e.weight,
      totalEdgeCount: e.totalEdgeCount,
      familyBreakdown: e.familyBreakdown,
      deckCount,
      inDeck: deckCount > 0,
      cls: nodesById?.get(neighborId)?.cls,
    });
  }
  out.sort((a, b) =>
    b.weight - a.weight
    || b.deckCount - a.deckCount
    || a.card.name.localeCompare(b.card.name),
  );
  return out;
}

export type DeckConnectionSummary = { uniqueCards: number; totalCopies: number };

export function deckConnectionSummary(neighbors: NeighborStat[]): DeckConnectionSummary {
  let uniqueCards = 0;
  let totalCopies = 0;
  for (const n of neighbors) {
    if (!n.inDeck) continue;
    uniqueCards += 1;
    totalCopies += n.deckCount;
  }
  return { uniqueCards, totalCopies };
}

export function buildFocusedGraph(input: FocusInput): GraphOutput {
  const focus = input.cards.get(input.focusOracleId);
  if (!focus) return { nodes: [], edges: [] };

  // Treat the focused card as a singleton "deck" so the deck-mode pipeline
  // surfaces its 1-hop neighbors as candidates with the same edge semantics.
  return buildDeckGraph({
    deckOracleIds: [input.focusOracleId],
    cards: input.cards,
    outbound: input.outbound,
    inbound: input.inbound,
    filters: input.filters,
  });
}

export const MAX_BRIDGES = 20;

export type BridgeExpansionInput = {
  base: GraphOutput;
  selectedId: string;
  deckOracleIds: Set<string>;
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export function expandWithBridges(input: BridgeExpansionInput): GraphOutput {
  const { base, selectedId, deckOracleIds, cards, outbound, inbound, filters } = input;
  const baseNodeIds = new Set(base.nodes.map((n) => n.id));

  const candidateIds = new Set<string>();
  function collectFromEdge(other: string, fam: FamilyId | undefined) {
    if (!fam || filters.offFamilies.has(fam)) return;
    if (other === selectedId) return;
    if (baseNodeIds.has(other)) return;
    if (deckOracleIds.has(other)) return;
    if (!cards.has(other)) return;
    candidateIds.add(other);
  }
  for (const e of outbound.get(selectedId) ?? []) {
    collectFromEdge(e.target, familyFor(e.reason.sourceTagId)?.id);
  }
  for (const e of inbound.get(selectedId) ?? []) {
    collectFromEdge(e.source, familyFor(e.reason.sourceTagId)?.id);
  }

  type BridgeData = {
    bridgeId: string;
    bridgeCard: Card;
    selectedFamilyCounts: Map<FamilyId, number>;
    deckFamilyCountsByDeckId: Map<string, Map<FamilyId, number>>;
  };
  // Pre-group selected-node edges by the other endpoint for O(1) lookup in the per-bridge loop.
  const selEdgesByNeighbor = new Map<string, InteractionEdge[]>();
  for (const e of outbound.get(selectedId) ?? []) {
    const list = selEdgesByNeighbor.get(e.target) ?? [];
    list.push(e);
    selEdgesByNeighbor.set(e.target, list);
  }
  for (const e of inbound.get(selectedId) ?? []) {
    const list = selEdgesByNeighbor.get(e.source) ?? [];
    list.push(e);
    selEdgesByNeighbor.set(e.source, list);
  }

  const bridges: BridgeData[] = [];
  for (const bridgeId of candidateIds) {
    const bridgeCard = cards.get(bridgeId);
    if (!bridgeCard) continue;
    if (!colorAllowed(bridgeCard, filters.onColors)) continue;

    const selFamCounts = new Map<FamilyId, number>();
    const tallySel = (fam: FamilyId | undefined) => {
      if (!fam || filters.offFamilies.has(fam)) return;
      selFamCounts.set(fam, (selFamCounts.get(fam) ?? 0) + 1);
    };
    for (const e of selEdgesByNeighbor.get(bridgeId) ?? []) {
      tallySel(familyFor(e.reason.sourceTagId)?.id);
    }
    if (selFamCounts.size === 0) continue;

    const deckFamCounts = new Map<string, Map<FamilyId, number>>();
    const tallyDeck = (deckId: string, fam: FamilyId | undefined) => {
      if (!fam || filters.offFamilies.has(fam)) return;
      if (deckId === selectedId) return;
      if (!deckOracleIds.has(deckId)) return;
      let m = deckFamCounts.get(deckId);
      if (!m) {
        m = new Map<FamilyId, number>();
        deckFamCounts.set(deckId, m);
      }
      m.set(fam, (m.get(fam) ?? 0) + 1);
    };
    for (const e of outbound.get(bridgeId) ?? []) {
      tallyDeck(e.target, familyFor(e.reason.sourceTagId)?.id);
    }
    for (const e of inbound.get(bridgeId) ?? []) {
      tallyDeck(e.source, familyFor(e.reason.sourceTagId)?.id);
    }
    if (deckFamCounts.size === 0) continue;

    bridges.push({
      bridgeId,
      bridgeCard,
      selectedFamilyCounts: selFamCounts,
      deckFamilyCountsByDeckId: deckFamCounts,
    });
  }

  function weightFromFamCounts(m: Map<FamilyId, number>): number {
    let total = 0;
    for (const c of m.values()) total += 1 + WEIGHT_DIMINISH * (c - 1);
    return total;
  }
  type Ranked = BridgeData & { totalReachWeight: number };
  const ranked: Ranked[] = bridges.map((b) => {
    let total = 0;
    for (const m of b.deckFamilyCountsByDeckId.values()) total += weightFromFamCounts(m);
    return { ...b, totalReachWeight: total };
  });
  ranked.sort((a, b) =>
    b.totalReachWeight - a.totalReachWeight
    || a.bridgeCard.name.localeCompare(b.bridgeCard.name),
  );
  const top = ranked.slice(0, MAX_BRIDGES);

  function buildBridgeEdge(a: string, b: string, fams: Map<FamilyId, number>): GraphEdge {
    const breakdown: FamilyBreakdownEntry[] = [];
    let dominantFamily: FamilyId | null = null;
    let dominantCount = -1;
    let total = 0;
    for (const [fam, count] of fams) {
      total += count;
      breakdown.push({ familyId: fam, count, score: 1 + WEIGHT_DIMINISH * (count - 1) });
      if (count > dominantCount) {
        dominantCount = count;
        dominantFamily = fam;
      }
    }
    const weight = breakdown.reduce((s, e) => s + e.score, 0);
    return {
      source: a,
      target: b,
      dominantFamily: dominantFamily!,
      totalEdgeCount: total,
      weight,
      familyBreakdown: breakdown,
      kind: 'bridge',
    };
  }

  const bridgeEdges: GraphEdge[] = [];
  for (const b of top) {
    bridgeEdges.push(buildBridgeEdge(selectedId, b.bridgeId, b.selectedFamilyCounts));
    for (const [deckId, fams] of b.deckFamilyCountsByDeckId) {
      bridgeEdges.push(buildBridgeEdge(b.bridgeId, deckId, fams));
    }
  }

  const incidentCount = new Map<string, number>();
  for (const e of bridgeEdges) {
    incidentCount.set(e.source, (incidentCount.get(e.source) ?? 0) + 1);
    incidentCount.set(e.target, (incidentCount.get(e.target) ?? 0) + 1);
  }
  const bridgeNodes: GraphNode[] = top.map((b) => {
    const ec = incidentCount.get(b.bridgeId) ?? 0;
    return { id: b.bridgeId, cls: 'bridge', card: b.bridgeCard, radius: radiusFor(ec), edgeCount: ec };
  });

  // If selectedId is itself off-canvas (e.g. user clicked a previously-rendered
  // bridge), render it as a synthetic 'bridge' node with its own deck-reach
  // edges. Mirrors the deck-reach computation we did for each candidate bridge.
  if (!baseNodeIds.has(selectedId)) {
    const selectedCard = cards.get(selectedId);
    if (selectedCard) {
      const selectedToDeck = new Map<string, Map<FamilyId, number>>();
      const tallySelectedToDeck = (deckId: string, fam: FamilyId | undefined) => {
        if (!fam || filters.offFamilies.has(fam)) return;
        if (!deckOracleIds.has(deckId)) return;
        let m = selectedToDeck.get(deckId);
        if (!m) {
          m = new Map<FamilyId, number>();
          selectedToDeck.set(deckId, m);
        }
        m.set(fam, (m.get(fam) ?? 0) + 1);
      };
      for (const e of outbound.get(selectedId) ?? []) {
        tallySelectedToDeck(e.target, familyFor(e.reason.sourceTagId)?.id);
      }
      for (const e of inbound.get(selectedId) ?? []) {
        tallySelectedToDeck(e.source, familyFor(e.reason.sourceTagId)?.id);
      }
      for (const [deckId, fams] of selectedToDeck) {
        bridgeEdges.push(buildBridgeEdge(selectedId, deckId, fams));
      }

      // Only materialise the synthetic node when it has at least one deck-reach
      // edge or is an endpoint of a bridge edge (i.e. it's actually connected
      // to something meaningful). An isolated card with no edges stays invisible.
      const selectedIncidentCount = bridgeEdges.filter(
        (e) => e.source === selectedId || e.target === selectedId,
      ).length;
      if (selectedIncidentCount > 0) {
        bridgeNodes.push({
          id: selectedId,
          cls: 'bridge',
          card: selectedCard,
          radius: radiusFor(selectedIncidentCount),
          edgeCount: selectedIncidentCount,
        });
      }
    }
  }

  if (bridgeNodes.length === 0 && bridgeEdges.length === 0) return base;

  // Defensive: every edge must reference a node that exists in `nodes`,
  // otherwise d3-force `.links()` throws "node not found". This protects
  // against misaligned callers (e.g. focus mode where deckOracleIds covers
  // cards that never made it into base.nodes).
  const finalNodeIds = new Set([
    ...base.nodes.map((n) => n.id),
    ...bridgeNodes.map((n) => n.id),
  ]);
  const safeBridgeEdges = bridgeEdges.filter(
    (e) => finalNodeIds.has(e.source) && finalNodeIds.has(e.target),
  );

  return {
    nodes: [...base.nodes, ...bridgeNodes],
    edges: [...base.edges, ...safeBridgeEdges],
  };
}
