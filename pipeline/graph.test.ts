// pipeline/graph.test.ts
import { describe, it, expect } from 'vitest';
import { buildEdges } from './graph';
import type { Card, TagDef } from '../shared/types';

const catalog: TagDef[] = [
  { tagId: 'effect.create_token', axis: 'effect', label: '', description: '',
    pairsWith: ['trigger.creature_etb'] },
  { tagId: 'trigger.creature_etb', axis: 'trigger', label: '', description: '',
    pairsWith: ['effect.create_token'] },
];

function card(
  oracleId: string,
  tagIds: { id: string; axis: 'trigger' | 'effect' | 'condition' }[],
): Card {
  return {
    oracleId, name: oracleId, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '',
    tags: tagIds.map((t) => ({ tagId: t.id, axis: t.axis, evidence: '' })),
  };
}

describe('buildEdges', () => {
  it('creates edges from effect-bearing card to trigger-bearing card', () => {
    const A = card('A', [{ id: 'effect.create_token', axis: 'effect' }]);
    const B = card('B', [{ id: 'trigger.creature_etb', axis: 'trigger' }]);
    const edges = buildEdges([A, B], catalog);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('A');
    expect(edges[0].target).toBe('B');
    expect(edges[0].reason).toEqual({
      sourceTagId: 'effect.create_token',
      targetTagId: 'trigger.creature_etb',
      direction: 'source_produces_for_target',
    });
  });

  it('creates bidirectional edges when both cards have both axes', () => {
    const A = card('A', [
      { id: 'effect.create_token', axis: 'effect' },
      { id: 'trigger.creature_etb', axis: 'trigger' },
    ]);
    const B = card('B', [
      { id: 'effect.create_token', axis: 'effect' },
      { id: 'trigger.creature_etb', axis: 'trigger' },
    ]);
    const edges = buildEdges([A, B], catalog);
    // A→B and B→A
    expect(edges).toHaveLength(2);
    expect(new Set(edges.map((e) => `${e.source}->${e.target}`)))
      .toEqual(new Set(['A->B', 'B->A']));
  });

  it('does not create self-edges', () => {
    const A = card('A', [
      { id: 'effect.create_token', axis: 'effect' },
      { id: 'trigger.creature_etb', axis: 'trigger' },
    ]);
    expect(buildEdges([A], catalog)).toEqual([]);
  });

  it('creates edges from effect-bearing card to condition-bearing card', () => {
    const conditionCatalog: TagDef[] = [
      { tagId: 'effect.plus_one_counter', axis: 'effect', label: '', description: '',
        pairsWith: ['condition.cares_plus_one_counter'] },
      { tagId: 'condition.cares_plus_one_counter', axis: 'condition', label: '', description: '',
        pairsWith: ['effect.plus_one_counter'] },
    ];
    const A = card('A', [{ id: 'effect.plus_one_counter', axis: 'effect' }]);
    const B = card('B', [{ id: 'condition.cares_plus_one_counter', axis: 'condition' }]);
    const edges = buildEdges([A, B], conditionCatalog);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('A');
    expect(edges[0].target).toBe('B');
    expect(edges[0].reason.targetTagId).toBe('condition.cares_plus_one_counter');
  });

  it('produces no duplicate edges for the same tag pair', () => {
    const A = card('A', [
      { id: 'effect.create_token', axis: 'effect' },
      { id: 'effect.create_token', axis: 'effect' }, // duplicate tag (shouldn't happen but guard)
    ]);
    const B = card('B', [{ id: 'trigger.creature_etb', axis: 'trigger' }]);
    const edges = buildEdges([A, B], catalog);
    expect(edges).toHaveLength(1);
  });

  it('emits an edge when only the condition side declares the pairing', () => {
    // The effect has empty pairsWith; only the condition declares it.
    const oneSidedCatalog: TagDef[] = [
      { tagId: 'effect.life_changed', axis: 'effect', label: '', description: '', pairsWith: [] },
      { tagId: 'condition.cares_lifegain', axis: 'condition', label: '', description: '',
        pairsWith: ['effect.life_changed'] },
    ];
    const A = card('A', [{ id: 'effect.life_changed', axis: 'effect' }]);
    const B = card('B', [{ id: 'condition.cares_lifegain', axis: 'condition' }]);
    const edges = buildEdges([A, B], oneSidedCatalog);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: 'A',
      target: 'B',
      reason: { sourceTagId: 'effect.life_changed', targetTagId: 'condition.cares_lifegain' },
    });
  });

  it('emits an edge when only the trigger side declares the pairing', () => {
    const oneSidedCatalog: TagDef[] = [
      { tagId: 'effect.create_token', axis: 'effect', label: '', description: '', pairsWith: [] },
      { tagId: 'trigger.creature_etb', axis: 'trigger', label: '', description: '',
        pairsWith: ['effect.create_token'] },
    ];
    const A = card('A', [{ id: 'effect.create_token', axis: 'effect' }]);
    const B = card('B', [{ id: 'trigger.creature_etb', axis: 'trigger' }]);
    const edges = buildEdges([A, B], oneSidedCatalog);
    expect(edges).toHaveLength(1);
  });

  it('does not duplicate edges when both sides declare the pairing', () => {
    // catalog (top of file) already declares the pairing on both sides.
    const A = card('A', [{ id: 'effect.create_token', axis: 'effect' }]);
    const B = card('B', [{ id: 'trigger.creature_etb', axis: 'trigger' }]);
    const edges = buildEdges([A, B], catalog);
    expect(edges).toHaveLength(1);
  });

  it('tribe edge only forms when token creature type matches', () => {
    const humansMaker: Card = {
      ...card('humans-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 1/1 white human soldier creature token',
          metadata: { creatureTypes: ['human', 'soldier'] },
        },
      ],
    };
    const zombiesMaker: Card = {
      ...card('zombies-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 2/2 black zombie creature token',
          metadata: { creatureTypes: ['zombie'] },
        },
      ],
    };
    const humansPayoff = card('humans-payoff', [
      { id: 'condition.cares_tribe.human', axis: 'condition' },
    ]);
    const tribeCatalog: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '', pairsWith: [] },
      { tagId: 'condition.cares_tribe.human', axis: 'condition', label: '', description: '',
        pairsWith: ['effect.create_creature_token'] },
    ];
    const edges = buildEdges([humansMaker, zombiesMaker, humansPayoff], tribeCatalog);
    const tribeEdges = edges.filter((e) => e.reason.targetTagId === 'condition.cares_tribe.human');
    expect(tribeEdges).toHaveLength(1);
    expect(tribeEdges[0]?.source).toBe('humans-maker');
  });

  // Tribe-gated trigger: an Obyra-like card carries both a generic creature-ETB
  // trigger and a cares_tribe condition. Its trigger edges should narrow to
  // sources that make tokens of that tribe — the trigger only fires on faerie
  // ETBs, so a zombie-token maker shouldn't form a real interaction edge.
  it('gates trigger.another_creature_etb edges by co-tagged cares_tribe', () => {
    const faerieMaker: Card = {
      ...card('faerie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 1/1 blue faerie creature token with flying',
          metadata: { creatureTypes: ['faerie'] },
        },
      ],
    };
    const zombieMaker: Card = {
      ...card('zombie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 2/2 black zombie creature token',
          metadata: { creatureTypes: ['zombie'] },
        },
      ],
    };
    const obyra = card('obyra', [
      { id: 'trigger.another_creature_etb', axis: 'trigger' },
      { id: 'condition.cares_tribe.faerie', axis: 'condition' },
    ]);
    const gateCatalog: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
        pairsWith: ['trigger.another_creature_etb'] },
      { tagId: 'trigger.another_creature_etb', axis: 'trigger', label: '', description: '',
        pairsWith: ['effect.create_creature_token'] },
      { tagId: 'condition.cares_tribe.faerie', axis: 'condition', label: '', description: '',
        pairsWith: ['effect.create_creature_token'] },
    ];
    const edges = buildEdges([faerieMaker, zombieMaker, obyra], gateCatalog);
    const triggerEdges = edges.filter(
      (e) => e.target === 'obyra' && e.reason.targetTagId === 'trigger.another_creature_etb',
    );
    expect(triggerEdges).toHaveLength(1);
    expect(triggerEdges[0]?.source).toBe('faerie-maker');
  });

  // Fall-through: a tribe-gated trigger card should still receive edges from
  // sources whose effect has no tribe metadata (reanimate, bounce, etc.). We
  // can't tell which subtype they'd actually bring into play, so the edge
  // forms rather than being conservatively dropped.
  it('passes through non-token sources to tribe-gated triggers', () => {
    const reanimator: Card = {
      ...card('reanimator', [{ id: 'effect.reanimate', axis: 'effect' }]),
      tags: [
        { tagId: 'effect.reanimate', axis: 'effect', evidence: 'return target creature card from graveyard' },
      ],
    };
    const obyra = card('obyra', [
      { id: 'trigger.another_creature_etb', axis: 'trigger' },
      { id: 'condition.cares_tribe.faerie', axis: 'condition' },
    ]);
    const cat: TagDef[] = [
      { tagId: 'effect.reanimate', axis: 'effect', label: '', description: '',
        pairsWith: ['trigger.another_creature_etb'] },
      { tagId: 'trigger.another_creature_etb', axis: 'trigger', label: '', description: '',
        pairsWith: ['effect.reanimate'] },
      { tagId: 'condition.cares_tribe.faerie', axis: 'condition', label: '', description: '',
        pairsWith: [] },
    ];
    const edges = buildEdges([reanimator, obyra], cat);
    const triggerEdges = edges.filter(
      (e) => e.target === 'obyra' && e.reason.targetTagId === 'trigger.another_creature_etb',
    );
    expect(triggerEdges).toHaveLength(1);
    expect(triggerEdges[0]?.source).toBe('reanimator');
  });

  // trigger.creature_dies gated by cares_tribe: faerie-token producer should
  // edge in; zombie-token producer should not. Sacrifice sources (no tribe
  // metadata) fall through.
  it('gates trigger.creature_dies edges by co-tagged cares_tribe', () => {
    const faerieMaker: Card = {
      ...card('faerie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 1/1 blue faerie creature token with flying',
          metadata: { creatureTypes: ['faerie'] },
        },
      ],
    };
    const zombieMaker: Card = {
      ...card('zombie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 2/2 black zombie creature token',
          metadata: { creatureTypes: ['zombie'] },
        },
      ],
    };
    const sacOutlet: Card = {
      ...card('sac-outlet', [{ id: 'effect.sacrifice_permanent', axis: 'effect' }]),
      tags: [
        { tagId: 'effect.sacrifice_permanent', axis: 'effect', evidence: 'sacrifice a creature' },
      ],
    };
    const faerieDeathLord = card('faerie-death-lord', [
      { id: 'trigger.creature_dies', axis: 'trigger' },
      { id: 'condition.cares_tribe.faerie', axis: 'condition' },
    ]);
    const cat: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
        pairsWith: ['trigger.creature_dies'] },
      { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '',
        pairsWith: ['trigger.creature_dies'] },
      { tagId: 'trigger.creature_dies', axis: 'trigger', label: '', description: '',
        pairsWith: ['effect.create_creature_token', 'effect.sacrifice_permanent'] },
      { tagId: 'condition.cares_tribe.faerie', axis: 'condition', label: '', description: '',
        pairsWith: [] },
    ];
    const edges = buildEdges(
      [faerieMaker, zombieMaker, sacOutlet, faerieDeathLord],
      cat,
    );
    const diesEdges = edges.filter(
      (e) => e.target === 'faerie-death-lord' && e.reason.targetTagId === 'trigger.creature_dies',
    );
    expect(new Set(diesEdges.map((e) => e.source))).toEqual(
      new Set(['faerie-maker', 'sac-outlet']),
    );
  });

  // Counter-example: an ungated ETB lord (no cares_tribe co-tag) should still
  // pair with every creature-token maker. The gate must not over-apply.
  it('ungated trigger.another_creature_etb still pairs with any creature-token maker', () => {
    const faerieMaker: Card = {
      ...card('faerie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 1/1 blue faerie creature token',
          metadata: { creatureTypes: ['faerie'] },
        },
      ],
    };
    const zombieMaker: Card = {
      ...card('zombie-maker', [{ id: 'effect.create_creature_token', axis: 'effect' }]),
      tags: [
        {
          tagId: 'effect.create_creature_token',
          axis: 'effect',
          evidence: 'create a 2/2 black zombie creature token',
          metadata: { creatureTypes: ['zombie'] },
        },
      ],
    };
    const plainLord = card('plain-lord', [
      { id: 'trigger.another_creature_etb', axis: 'trigger' },
    ]);
    const gateCatalog: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
        pairsWith: ['trigger.another_creature_etb'] },
      { tagId: 'trigger.another_creature_etb', axis: 'trigger', label: '', description: '',
        pairsWith: ['effect.create_creature_token'] },
    ];
    const edges = buildEdges([faerieMaker, zombieMaker, plainLord], gateCatalog);
    const triggerEdges = edges.filter(
      (e) => e.target === 'plain-lord' && e.reason.targetTagId === 'trigger.another_creature_etb',
    );
    expect(triggerEdges).toHaveLength(2);
    expect(new Set(triggerEdges.map((e) => e.source))).toEqual(
      new Set(['faerie-maker', 'zombie-maker']),
    );
  });

  describe('conditional pairings (requiresOnSource / requiresOnTarget)', () => {
    const gatedCatalog: TagDef[] = [
      { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'effect.sacrifice_creature', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '',
        pairsWith: [] },
      { tagId: 'condition.cares_creatures_died_this_turn', axis: 'condition', label: '', description: '',
        pairsWith: [
          {
            tagId: 'effect.create_creature_token',
            requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
          },
        ] },
    ];

    it('skips the edge when the source lacks all required tags', () => {
      const tokenOnly = card('tokenOnly', [
        { id: 'effect.create_creature_token', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenOnly, morbid], gatedCatalog);
      expect(edges).toEqual([]);
    });

    it('forms the edge when the source has one of the required tags (any mode)', () => {
      const tokenAndSac = card('tokenAndSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenAndSac, morbid], gatedCatalog);
      const gatedEdge = edges.find(
        (e) =>
          e.reason.sourceTagId === 'effect.create_creature_token' &&
          e.reason.targetTagId === 'condition.cares_creatures_died_this_turn',
      );
      expect(gatedEdge).toBeDefined();
      expect(gatedEdge!.source).toBe('tokenAndSac');
      expect(gatedEdge!.target).toBe('morbid');
    });

    it('forms the edge when the source has the OTHER required tag (any mode)', () => {
      const tokenAndPermSac = card('tokenAndPermSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_permanent', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([tokenAndPermSac, morbid], gatedCatalog);
      const gatedEdge = edges.find(
        (e) => e.reason.sourceTagId === 'effect.create_creature_token',
      );
      expect(gatedEdge).toBeDefined();
    });

    it('requiresMode=all needs every listed tag on the source', () => {
      const allModeCatalog: TagDef[] = [
        { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'effect.sacrifice_creature', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '',
          pairsWith: [] },
        { tagId: 'condition.cares_creatures_died_this_turn', axis: 'condition', label: '', description: '',
          pairsWith: [
            {
              tagId: 'effect.create_creature_token',
              requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
              requiresMode: 'all',
            },
          ] },
      ];
      const onlyCreatureSac = card('onlyCreatureSac', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
      ]);
      const both = card('both', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
        { id: 'effect.sacrifice_permanent', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([onlyCreatureSac, both, morbid], allModeCatalog);
      const sources = new Set(
        edges
          .filter((e) => e.reason.sourceTagId === 'effect.create_creature_token')
          .map((e) => e.source),
      );
      expect(sources.has('both')).toBe(true);
      expect(sources.has('onlyCreatureSac')).toBe(false);
    });

    it('requiresOnTarget gates by tags on the target card', () => {
      const targetGatedCatalog: TagDef[] = [
        { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '',
          pairsWith: [
            {
              tagId: 'condition.x',
              requiresOnTarget: ['condition.y'],
            },
          ] },
        { tagId: 'condition.x', axis: 'condition', label: '', description: '', pairsWith: [] },
        { tagId: 'condition.y', axis: 'condition', label: '', description: '', pairsWith: [] },
      ];
      const src = card('src', [{ id: 'effect.create_creature_token', axis: 'effect' }]);
      const tgtBare = card('tgtBare', [{ id: 'condition.x', axis: 'condition' }]);
      const tgtBoth = card('tgtBoth', [
        { id: 'condition.x', axis: 'condition' },
        { id: 'condition.y', axis: 'condition' },
      ]);
      const edges = buildEdges([src, tgtBare, tgtBoth], targetGatedCatalog);
      const targets = new Set(edges.map((e) => e.target));
      expect(targets.has('tgtBoth')).toBe(true);
      expect(targets.has('tgtBare')).toBe(false);
    });

    it('bare-string pairing coexists with the gated pairing on the same target', () => {
      const mixedCatalog: TagDef[] = [
        { tagId: 'effect.create_creature_token', axis: 'effect', label: '', description: '', pairsWith: [] },
        { tagId: 'effect.sacrifice_creature', axis: 'effect', label: '', description: '', pairsWith: [] },
        { tagId: 'effect.sacrifice_permanent', axis: 'effect', label: '', description: '', pairsWith: [] },
        { tagId: 'condition.cares_creatures_died_this_turn', axis: 'condition', label: '', description: '',
          pairsWith: [
            'effect.sacrifice_creature',
            {
              tagId: 'effect.create_creature_token',
              requiresOnSource: ['effect.sacrifice_creature', 'effect.sacrifice_permanent'],
            },
          ] },
      ];
      const aristocrat = card('aristocrat', [
        { id: 'effect.create_creature_token', axis: 'effect' },
        { id: 'effect.sacrifice_creature', axis: 'effect' },
      ]);
      const morbid = card('morbid', [
        { id: 'condition.cares_creatures_died_this_turn', axis: 'condition' },
      ]);
      const edges = buildEdges([aristocrat, morbid], mixedCatalog);
      const effectIds = new Set(
        edges
          .filter((e) => e.source === 'aristocrat' && e.target === 'morbid')
          .map((e) => e.reason.sourceTagId),
      );
      expect(effectIds.has('effect.sacrifice_creature')).toBe(true);
      expect(effectIds.has('effect.create_creature_token')).toBe(true);
    });
  });
});
