import { describe, it, expect } from 'vitest';
import type { Card, InteractionEdge } from '@shared/types';
import {
  scoreCandidate,
  buildDeckGraph,
  buildFocusedGraph,
  neighborStats,
  deckConnectionSummary,
  expandWithBridges,
  type CandidateScoreInput,
  type FilterState,
  type GraphEdge,
  type GraphInput,
  type GraphOutput,
} from './deckGraph';

function card(id: string, colorIdentity: Card['colorIdentity'] = []): Card {
  return {
    oracleId: id,
    name: id,
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    manaCost: null,
    cmc: 0,
    colors: colorIdentity,
    colorIdentity,
    typeLine: 'Creature',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: '',
    keywords: [],
    power: null,
    toughness: null,
    rarity: 'common',
    imageUrl: '',
    tags: [],
  };
}

function edge(source: string, target: string, sourceTagId: string, targetTagId: string): InteractionEdge {
  return {
    source, target,
    reason: { sourceTagId, targetTagId, direction: 'source_produces_for_target' },
  };
}

const noFilter: FilterState = {
  offFamilies: new Set(),
  onColors: new Set(), // empty = no color restriction
};

describe('scoreCandidate', () => {
  it('returns 0 for a candidate with no edges to the deck', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map(),
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('scores a single edge in a single family at the base weight', () => {
    const pair = edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies');
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([['c1|d1', [pair]]]),
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBeCloseTo(1.0);
  });

  it('applies diminishing returns to multiple edges in the same family/pair', () => {
    const e1 = edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies');
    const e2 = edge('c1', 'd1', 'effect.destroy_artifact', 'trigger.artifact_leaves_battlefield');
    const e3 = edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies');
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([['c1|d1', [e1, e2, e3]]]),
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    // 3 destruction edges → weight = 1 + 0.3*2 = 1.6, breadth(1) = 1.0
    expect(scoreCandidate(input)).toBeCloseTo(1.6);
  });

  it('rewards breadth: 3 distinct deck targets > 3 edges to one target', () => {
    const broad: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d2', [edge('c1', 'd2', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d3', [edge('c1', 'd3', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1', 'd2', 'd3']),
      filters: noFilter,
    };
    const narrow: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [
          edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
          edge('c1', 'd1', 'effect.destroy_artifact', 'trigger.artifact_leaves_battlefield'),
          edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies'),
        ]],
      ]),
      deckOracleIds: new Set(['d1', 'd2', 'd3']),
      filters: noFilter,
    };
    expect(scoreCandidate(broad)).toBeGreaterThan(scoreCandidate(narrow));
  });

  it('sums across multiple families', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d2', [edge('c1', 'd2', 'effect.life_changed', 'condition.cares_lifegain')]],
      ]),
      deckOracleIds: new Set(['d1', 'd2']),
      filters: noFilter,
    };
    // 1 destruction edge × 1 deck card + 1 lifegain edge × 1 deck card = 1 + 1 = 2
    expect(scoreCandidate(input)).toBeCloseTo(2.0);
  });

  it('zeros families toggled off', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('zeros candidates whose color identity is not a subset of toggled-on colors', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', ['W', 'U', 'G']),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(),
        onColors: new Set(['W', 'B', 'R', 'G']), // U is off
      },
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('allows mono-color cards when their color is on', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', ['B']),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(),
        onColors: new Set(['B', 'G']),
      },
    };
    expect(scoreCandidate(input)).toBeGreaterThan(0);
  });

  it('treats an empty onColors set as no color restriction', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', ['W', 'U', 'B', 'R', 'G']),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: { offFamilies: new Set(), onColors: new Set() },
    };
    expect(scoreCandidate(input)).toBeGreaterThan(0);
  });

  it('excludes colorless candidates when "C" is not in onColors', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', []),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: { offFamilies: new Set(), onColors: new Set(['B']) },
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('includes colorless candidates when "C" is in onColors', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', []),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: { offFamilies: new Set(), onColors: new Set(['B', 'C']) },
    };
    expect(scoreCandidate(input)).toBeGreaterThan(0);
  });
});

describe('buildDeckGraph', () => {
  function inputWith(opts: {
    deckIds: string[];
    deckCards: Card[];
    candidateCards: Card[];
    edges: InteractionEdge[];
    filters?: FilterState;
  }): GraphInput {
    const cards = new Map<string, Card>();
    for (const c of [...opts.deckCards, ...opts.candidateCards]) cards.set(c.oracleId, c);
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    for (const e of opts.edges) {
      const out = outbound.get(e.source) ?? [];
      out.push(e);
      outbound.set(e.source, out);
      const inb = inbound.get(e.target) ?? [];
      inb.push(e);
      inbound.set(e.target, inb);
    }
    return {
      deckOracleIds: opts.deckIds,
      cards,
      outbound,
      inbound,
      filters: opts.filters ?? noFilter,
    };
  }

  it('returns empty nodes/edges for an empty deck', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: [], deckCards: [], candidateCards: [card('c1')], edges: [],
    }));
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it('returns deck-only nodes when deck has no edges to outside cards', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [card('c1')],
      edges: [],
    }));
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['d1', 'd2']);
    expect(g.nodes.every((n) => n.cls === 'deck')).toBe(true);
    expect(g.edges).toEqual([]);
  });

  it('includes candidates that have edges to deck cards, ranked by score', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [card('c1'), card('c2'), card('c3')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c2', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c2', 'd2', 'effect.life_changed', 'condition.cares_lifegain'),
      ],
    }));
    const candidateNodes = g.nodes.filter((n) => n.cls === 'candidate').map((n) => n.id);
    expect(candidateNodes).toEqual(['c2', 'c1']);
  });

  it('builds one edge per (source, target) pair with dominant family + breakdown', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies'),
        edge('c1', 'd1', 'effect.life_changed', 'condition.cares_lifegain'),
      ],
    }));
    expect(g.edges).toHaveLength(1);
    const e = g.edges[0]!;
    const endpoints = [e.source, e.target].sort();
    expect(endpoints).toEqual(['c1', 'd1']);
    expect(e.dominantFamily).toBe('destruction');
    expect(e.totalEdgeCount).toBe(3);
    const breakdownIds = e.familyBreakdown.map((b) => b.familyId).sort();
    expect(breakdownIds).toEqual(['destruction', 'lifegain']);
  });

  it('caps candidates at MAX_CANDIDATES', () => {
    const deck = [card('d1')];
    const candidates: Card[] = [];
    const edges: InteractionEdge[] = [];
    for (let i = 0; i < 70; i++) {
      candidates.push(card(`c${i}`));
      edges.push(edge(`c${i}`, 'd1', 'effect.destroy_creature', 'trigger.creature_dies'));
    }
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'], deckCards: deck, candidateCards: candidates, edges,
    }));
    const candCount = g.nodes.filter((n) => n.cls === 'candidate').length;
    expect(candCount).toBe(50);
  });

  it('drops candidates filtered out by color', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c-mono-blue', ['U']), card('c-mono-black', ['B'])],
      edges: [
        edge('c-mono-blue', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c-mono-black', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: { offFamilies: new Set(), onColors: new Set(['B', 'G']) },
    }));
    const candidateIds = g.nodes.filter((n) => n.cls === 'candidate').map((n) => n.id);
    expect(candidateIds).toEqual(['c-mono-black']);
  });

  it('drops edges whose family is toggled off, and candidates whose score drops to 0', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    }));
    expect(g.nodes.filter((n) => n.cls === 'candidate')).toEqual([]);
    expect(g.edges).toEqual([]);
  });
});

describe('buildFocusedGraph', () => {
  it('centers on the focused card and includes its 1-hop neighbors', () => {
    const cards = new Map<string, Card>();
    for (const id of ['f1', 'n1', 'n2', 'far']) cards.set(id, card(id));
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    const allEdges = [
      edge('f1', 'n1', 'effect.destroy_creature', 'trigger.creature_dies'),
      edge('n2', 'f1', 'effect.life_changed', 'condition.cares_lifegain'),
      // 'far' is 2 hops away (via n1), should not appear
      edge('n1', 'far', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    for (const e of allEdges) {
      const out = outbound.get(e.source) ?? [];
      out.push(e);
      outbound.set(e.source, out);
      const inb = inbound.get(e.target) ?? [];
      inb.push(e);
      inbound.set(e.target, inb);
    }
    const g = buildFocusedGraph({
      focusOracleId: 'f1',
      cards, outbound, inbound,
      filters: noFilter,
    });
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['f1', 'n1', 'n2']);
    expect(g.nodes.find((n) => n.id === 'f1')?.cls).toBe('deck');
  });

  it('respects family and color filters', () => {
    const cards = new Map<string, Card>();
    cards.set('f1', card('f1'));
    cards.set('n1', card('n1', ['U']));
    cards.set('n2', card('n2', ['B']));
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    const allEdges = [
      edge('f1', 'n1', 'effect.destroy_creature', 'trigger.creature_dies'),
      edge('f1', 'n2', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    for (const e of allEdges) {
      const out = outbound.get(e.source) ?? [];
      out.push(e);
      outbound.set(e.source, out);
      const inb = inbound.get(e.target) ?? [];
      inb.push(e);
      inbound.set(e.target, inb);
    }
    const g = buildFocusedGraph({
      focusOracleId: 'f1', cards, outbound, inbound,
      filters: { offFamilies: new Set(), onColors: new Set(['B']) }, // U off
    });
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['f1', 'n2']);
  });
});

describe('neighborStats', () => {
  function graphEdge(source: string, target: string, weight: number, totalEdgeCount: number): GraphEdge {
    return {
      source, target,
      dominantFamily: 'destruction',
      totalEdgeCount,
      weight,
      familyBreakdown: [{ familyId: 'destruction', count: totalEdgeCount, score: weight }],
      kind: 'base',
    };
  }

  it('returns one stat per incident edge, with neighbor card + deck count', () => {
    const cards = new Map([['d1', card('d1')], ['d2', card('d2')]]);
    const stats = neighborStats(
      'sel',
      [graphEdge('sel', 'd1', 1, 1), graphEdge('d2', 'sel', 2, 2)],
      cards,
      new Map([['d1', 4], ['d2', 2]]),
    );
    expect(stats).toHaveLength(2);
    expect(stats.map((s) => s.oracleId).sort()).toEqual(['d1', 'd2']);
    const d1 = stats.find((s) => s.oracleId === 'd1');
    expect(d1?.deckCount).toBe(4);
    expect(d1?.inDeck).toBe(true);
  });

  it('skips edges whose neighbor is not in the card map', () => {
    const cards = new Map([['d1', card('d1')]]);
    const stats = neighborStats(
      'sel',
      [graphEdge('sel', 'd1', 1, 1), graphEdge('sel', 'missing', 1, 1)],
      cards,
      new Map(),
    );
    expect(stats).toHaveLength(1);
    expect(stats[0]?.oracleId).toBe('d1');
  });

  it('marks neighbors not in the deck as inDeck=false with deckCount=0', () => {
    const cards = new Map([['cand', card('cand')]]);
    const [stat] = neighborStats('sel', [graphEdge('sel', 'cand', 1, 1)], cards, new Map());
    expect(stat?.inDeck).toBe(false);
    expect(stat?.deckCount).toBe(0);
  });

  it('sorts by weight desc, then deck count desc, then name asc', () => {
    const cards = new Map([
      ['a', card('a')],
      ['b', card('b')],
      ['c', card('c')],
      ['d', card('d')],
    ]);
    const stats = neighborStats(
      'sel',
      [
        graphEdge('sel', 'a', 2, 2),   // weight 2
        graphEdge('sel', 'b', 5, 5),   // weight 5 — wins
        graphEdge('sel', 'c', 2, 2),   // weight 2, deck 3 — beats a (deck 1) at tie
        graphEdge('sel', 'd', 2, 2),   // weight 2, deck 0 — last
      ],
      cards,
      new Map([['a', 1], ['c', 3]]),
    );
    expect(stats.map((s) => s.oracleId)).toEqual(['b', 'c', 'a', 'd']);
  });
});

describe('deckConnectionSummary', () => {
  function makeStat(oracleId: string, deckCount: number) {
    return {
      oracleId,
      card: card(oracleId),
      weight: 1,
      totalEdgeCount: 1,
      familyBreakdown: [],
      deckCount,
      inDeck: deckCount > 0,
    };
  }

  it('counts unique deck cards and total copies', () => {
    const summary = deckConnectionSummary([makeStat('a', 4), makeStat('b', 2), makeStat('c', 1)]);
    expect(summary).toEqual({ uniqueCards: 3, totalCopies: 7 });
  });

  it('ignores neighbors not in the deck', () => {
    const summary = deckConnectionSummary([makeStat('a', 4), makeStat('cand', 0)]);
    expect(summary).toEqual({ uniqueCards: 1, totalCopies: 4 });
  });

  it('handles an empty neighbor list', () => {
    expect(deckConnectionSummary([])).toEqual({ uniqueCards: 0, totalCopies: 0 });
  });
});

describe('expandWithBridges', () => {
  // Helper: build a GraphOutput + edge maps from a flat list of InteractionEdges.
  // Returns the pieces needed to call expandWithBridges.
  function setup(opts: {
    deckIds: string[];
    deckCards: Card[];
    candidateCards: Card[];   // appear in base graph
    bridgeCards: Card[];      // exist in `cards` map only; off-canvas relative to base graph
    edges: InteractionEdge[];
    filters?: FilterState;
  }) {
    const cards = new Map<string, Card>();
    for (const c of [...opts.deckCards, ...opts.candidateCards, ...opts.bridgeCards]) {
      cards.set(c.oracleId, c);
    }
    const bridgeIds = new Set(opts.bridgeCards.map((c) => c.oracleId));

    // Two edge maps: base maps drive buildDeckGraph (so bridge cards stay
    // off-canvas), full maps are what expandWithBridges sees (the whole
    // interaction graph). In production this distinction emerges naturally
    // from MAX_CANDIDATES capping the base graph; in tiny fixtures we have
    // to filter explicitly.
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    const baseOutbound = new Map<string, InteractionEdge[]>();
    const baseInbound = new Map<string, InteractionEdge[]>();
    for (const e of opts.edges) {
      const out = outbound.get(e.source) ?? [];
      out.push(e);
      outbound.set(e.source, out);
      const inb = inbound.get(e.target) ?? [];
      inb.push(e);
      inbound.set(e.target, inb);
      if (!bridgeIds.has(e.source) && !bridgeIds.has(e.target)) {
        const bo = baseOutbound.get(e.source) ?? [];
        bo.push(e);
        baseOutbound.set(e.source, bo);
        const bi = baseInbound.get(e.target) ?? [];
        bi.push(e);
        baseInbound.set(e.target, bi);
      }
    }
    const filters = opts.filters ?? noFilter;
    const base = buildDeckGraph({
      deckOracleIds: opts.deckIds,
      cards,
      outbound: baseOutbound,
      inbound: baseInbound,
      filters,
    });
    return {
      base,
      cards,
      outbound,
      inbound,
      filters,
      deckOracleIds: new Set(opts.deckIds),
    };
  }

  it('returns base unchanged when selected id is not in cards or has no edges', () => {
    const ctx = setup({
      deckIds: ['d1'], deckCards: [card('d1')],
      candidateCards: [], bridgeCards: [], edges: [],
    });
    const out = expandWithBridges({
      ...ctx,
      selectedId: 'missing',
    });
    expect(out).toBe(ctx.base);
  });

  it('adds a synthetic bridge node and deck-reach edges when the selected card is off-canvas', () => {
    // selectedBridge is not in deck, not a candidate in the base graph (because we
    // explicitly hold it back via the setup helper's bridgeCards arg), but it has
    // edges to a deck card AND to a brand-new off-canvas bridge that also reaches
    // the deck. Simulates the "user clicked a bridge from a previous expansion."
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [],
      bridgeCards: [card('clickedBridge'), card('newBridge')],
      edges: [
        // clickedBridge reaches the deck (this is what made it a bridge originally)
        edge('clickedBridge', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        // clickedBridge has another off-canvas neighbor newBridge that itself reaches the deck
        edge('clickedBridge', 'newBridge', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('newBridge', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'clickedBridge' });
    // The clicked bridge appears as a synthetic node.
    const clicked = out.nodes.find((n) => n.id === 'clickedBridge');
    expect(clicked?.cls).toBe('bridge');
    // clickedBridge ↔ d1 edge is present, kind 'bridge'.
    const deckReach = out.edges.find(
      (e) =>
        [e.source, e.target].sort().join('|') === 'clickedBridge|d1' && e.kind === 'bridge',
    );
    expect(deckReach).toBeDefined();
    // newBridge also surfaces as a bridge (of the new selection).
    const newBr = out.nodes.find((n) => n.id === 'newBridge');
    expect(newBr?.cls).toBe('bridge');
  });

  it('returns base unchanged when off-canvas selectedId has no deck reach and no bridges', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [],
      bridgeCards: [card('isolated')],
      edges: [],  // isolated has no edges at all
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'isolated' });
    expect(out).toBe(ctx.base);
  });

  it('adds a bridge node for an off-canvas neighbor that connects back to the deck', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),     // base graph
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),    // selected → bridge
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),    // bridge → deck
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeNode = out.nodes.find((n) => n.id === 'br1');
    expect(bridgeNode?.cls).toBe('bridge');

    const bridgeEdges = out.edges.filter((e) => e.kind === 'bridge');
    const pairs = bridgeEdges.map((e) => [e.source, e.target].sort().join('|')).sort();
    expect(pairs).toEqual(['br1|c1', 'br1|d1']);
  });

  it('excludes neighbors with no path back to the deck', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('lonely')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'lonely', 'effect.destroy_creature', 'trigger.creature_dies'), // no edge from lonely to deck
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'lonely')).toBeUndefined();
  });

  it('does not add a node that is already in the base graph', () => {
    // c2 is a base-graph candidate AND a neighbor of c1. It must not be re-added.
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1'), card('c2')],
      bridgeCards: [],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c2', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'c2', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const c2Nodes = out.nodes.filter((n) => n.id === 'c2');
    expect(c2Nodes).toHaveLength(1);
    expect(c2Nodes[0]?.cls).toBe('candidate');
    // No bridge edges should have been emitted, since c2 isn't a bridge candidate.
    expect(out.edges.filter((e) => e.kind === 'bridge')).toHaveLength(0);
  });

  it('caps surviving bridges at MAX_BRIDGES, ranked by summed bridge-to-deck weight', () => {
    const deckIds = ['d1'];
    const deckCards = [card('d1')];
    const candidateCards = [card('c1')];
    const bridgeCards: Card[] = [];
    const edges: InteractionEdge[] = [
      edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    // 30 bridges, each connected to selected (c1) once.
    // The first 20 (br00..br19) also reach the deck multiple times — higher
    // reach-weight; they should be the ones kept. Br20..br29 reach the deck
    // only once (lower weight); they should be dropped.
    for (let i = 0; i < 30; i++) {
      const id = `br${String(i).padStart(2, '0')}`;
      bridgeCards.push(card(id));
      edges.push(edge('c1', id, 'effect.destroy_creature', 'trigger.creature_dies'));
      const reachCount = i < 20 ? 3 : 1;
      for (let k = 0; k < reachCount; k++) {
        edges.push(edge(id, 'd1', 'effect.destroy_creature', 'trigger.creature_dies'));
      }
    }
    const ctx = setup({ deckIds, deckCards, candidateCards, bridgeCards, edges });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeIds = out.nodes.filter((n) => n.cls === 'bridge').map((n) => n.id).sort();
    expect(bridgeIds).toHaveLength(20);
    // The high-weight 20 (br00..br19) win.
    expect(bridgeIds).toEqual(Array.from({ length: 20 }, (_, i) => `br${String(i).padStart(2, '0')}`));
  });

  it('drops a bridge whose only reach-to-deck edge is in a filtered-off family', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'br1')).toBeUndefined();
  });

  it('drops a colorless bridge when "C" is not in onColors', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1', [])], // colorless
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: { offFamilies: new Set(), onColors: new Set(['B']) },
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'br1')).toBeUndefined();
  });

  it('when selected is a deck card, bridges reach OTHER deck cards (not self)', () => {
    const ctx = setup({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [],
      bridgeCards: [card('br1')],
      edges: [
        edge('d1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd2', 'effect.destroy_creature', 'trigger.creature_dies'),
        // bridge to selected itself — should NOT count as deck-reach.
        edge('br1', 'd1', 'effect.life_changed', 'condition.cares_lifegain'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'd1' });
    const bridgeNode = out.nodes.find((n) => n.id === 'br1');
    expect(bridgeNode?.cls).toBe('bridge');
    // br1↔d2 should appear as a bridge edge; br1↔d1 should NOT (it's the
    // selected-to-bridge edge, family 'lifegain', kept as kind:'bridge' but
    // counted under selected↔bridge, not deck-reach).
    const bridgeEdges = out.edges.filter((e) => e.kind === 'bridge');
    const reachesD2 = bridgeEdges.some(
      (e) => [e.source, e.target].sort().join('|') === 'br1|d2',
    );
    expect(reachesD2).toBe(true);
  });

  it('ranks ties deterministically by card name ascending', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('zeta'), card('alpha'), card('mike')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'zeta', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'alpha', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'mike', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('zeta', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('alpha', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('mike', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeNodes = out.nodes.filter((n) => n.cls === 'bridge');
    // All three have equal weight (1.0 each). Name tiebreak → alpha, mike, zeta.
    expect(bridgeNodes.map((n) => n.id)).toEqual(['alpha', 'mike', 'zeta']);
  });

  it('never emits an edge to a node not in the output (defensive endpoint invariant)', () => {
    // Reproduces the focus-mode crash: caller passes a deckOracleIds set that
    // does not match the base graph's contents. d3-force `.links()` then throws
    // "node not found" when it can't resolve a link endpoint. The function must
    // either materialise the missing endpoint or drop the edge.
    const ctx = setup({
      deckIds: ['F'],
      deckCards: [card('F')],
      candidateCards: [card('Y')],
      bridgeCards: [card('X'), card('D1')],
      edges: [
        edge('F', 'Y', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('Y', 'X', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('X', 'D1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({
      ...ctx,
      selectedId: 'Y',
      // Mimic the buggy call: real deck cards that aren't in base.nodes.
      deckOracleIds: new Set(['D1']),
    });
    const nodeIds = new Set(out.nodes.map((n) => n.id));
    for (const e of out.edges) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    }
  });
});
