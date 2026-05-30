import { describe, it, expect } from 'vitest';
import { getBasicOracleId, computeLandFill } from './fillMana';
import type { Card } from '@shared/types';
import type { Deck } from './db';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: 'Basic Land', types: ['Land'], subtypes: [], supertypes: ['Basic'],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

describe('getBasicOracleId', () => {
  it('returns oracleId of the first matching basic land for a color', () => {
    const cards = new Map<string, Card>([
      ['p1', card('p1', 'Plains', { subtypes: ['Plains'] })],
      ['i1', card('i1', 'Island', { subtypes: ['Island'] })],
      ['s1', card('s1', 'Swamp', { subtypes: ['Swamp'] })],
      ['m1', card('m1', 'Mountain', { subtypes: ['Mountain'] })],
      ['f1', card('f1', 'Forest', { subtypes: ['Forest'] })],
    ]);
    expect(getBasicOracleId('W', cards)).toBe('p1');
    expect(getBasicOracleId('G', cards)).toBe('f1');
  });

  it('returns undefined when no basic of that color exists', () => {
    expect(getBasicOracleId('W', new Map())).toBeUndefined();
  });

  it('ignores non-basics that share the subtype', () => {
    const cards = new Map<string, Card>([
      ['triome', card('triome', 'Indatha Triome', { subtypes: ['Plains', 'Swamp', 'Forest'], supertypes: [] })],
      ['p1', card('p1', 'Plains', { subtypes: ['Plains'] })],
    ]);
    expect(getBasicOracleId('W', cards)).toBe('p1');
  });
});

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0,
  };
}

describe('computeLandFill — empty / colorless', () => {
  it('returns empty plan with reason="empty" for an empty deck', () => {
    const plan = computeLandFill(deck([]), new Map());
    expect(plan.add).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.reason).toBe('empty');
    expect(plan.inferredTarget).toBe(40);
  });

  it('returns empty plan with reason="no_colored_spells" for a colorless artifact deck', () => {
    const cards = new Map<string, Card>([
      ['art', card('art', 'Colorless Artifact', { types: ['Artifact'], supertypes: [], manaCost: '{3}' })],
    ]);
    const d = deck([{ oracleId: 'art', count: 30 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.add).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.reason).toBe('no_colored_spells');
    expect(plan.inferredTarget).toBe(60);
  });

  it('honors targetOverride on the colorless path', () => {
    const cards = new Map<string, Card>([
      ['art', card('art', 'Colorless Artifact', { types: ['Artifact'], supertypes: [], manaCost: '{3}' })],
    ]);
    const d = deck([{ oracleId: 'art', count: 30 }]);
    const plan = computeLandFill(d, cards, { targetOverride: 40 });
    expect(plan.inferredTarget).toBe(40);
    expect(plan.reason).toBe('no_colored_spells');
  });
});

describe('computeLandFill — mono-color target detection', () => {
  it('22 mono-R spells (cmc 3) → 17 Mountains, target=40', () => {
    const cards = new Map<string, Card>([
      ['shock', card('shock', 'Shock', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 3, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'shock', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    expect(plan.basicsByColor).toEqual({ R: 17 });
    expect(plan.add).toEqual([{ oracleId: 'mountain', count: 17 }]);
    expect(plan.remove).toEqual([]);
  });

  it('36 mono-R spells (cmc 3) → 24 Mountains, target=60', () => {
    const cards = new Map<string, Card>([
      ['shock', card('shock', 'Shock', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 3, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'shock', count: 36 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(60);
    expect(plan.basicsByColor).toEqual({ R: 24 });
    expect(plan.add).toEqual([{ oracleId: 'mountain', count: 24 }]);
  });

  it('respects targetOverride', () => {
    const cards = new Map<string, Card>([
      ['shock', card('shock', 'Shock', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 3, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'shock', count: 22 }]);
    const plan = computeLandFill(d, cards, { targetOverride: 60 });
    expect(plan.inferredTarget).toBe(60);
    expect(plan.basicsByColor).toEqual({ R: 24 });
  });
});

describe('computeLandFill — multicolor pip-ratio', () => {
  it('22 spells with 50/50 W/G pips → Plains + Forest sum to 17', () => {
    const cards = new Map<string, Card>([
      ['savannah', card('savannah', 'Savannah Lions', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 3, colorIdentity: ['W'] })],
      ['llanowar', card('llanowar', 'Llanowar Elves', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 3, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    const d = deck([
      { oracleId: 'savannah', count: 11 },
      { oracleId: 'llanowar', count: 11 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.G ?? 0);
    expect(total).toBe(17);
    // 50/50 split with 17 lands: largest-remainder gives 9/8 or 8/9.
    expect(plan.basicsByColor.W).toBeGreaterThanOrEqual(8);
    expect(plan.basicsByColor.W).toBeLessThanOrEqual(9);
    expect(plan.basicsByColor.G).toBeGreaterThanOrEqual(8);
    expect(plan.basicsByColor.G).toBeLessThanOrEqual(9);
  });

  it('24 spells with 75/25 W/G pips (18 W : 6 G) → W gets the lion\'s share', () => {
    const cards = new Map<string, Card>([
      ['savannah', card('savannah', 'Savannah Lions', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 3, colorIdentity: ['W'] })],
      ['llanowar', card('llanowar', 'Llanowar Elves', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 3, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    // 18 W pips + 4 G pips = 22 pips. Ratio 18/22=0.818 W, 4/22=0.182 G.
    // 22 spells → target=40, baseLands=17.
    // 0.818 * 17 = 13.91. 0.182 * 17 = 3.09. Floor: 13 + 3 = 16. Remaining=1. Larger remainder=0.91 (W). Final: 14W + 3G.
    const d = deck([
      { oracleId: 'savannah', count: 18 },
      { oracleId: 'llanowar', count: 4 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.G ?? 0);
    expect(total).toBe(17);
    expect(plan.basicsByColor.W).toBe(14);
    expect(plan.basicsByColor.G).toBe(3);
  });
});

describe('computeLandFill — splash threshold', () => {
  it('drops a color with <15% of pips and redistributes', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 3, colorIdentity: ['W'] })],
      ['u_card', card('u_card', 'U card', { types: ['Creature'], supertypes: [], manaCost: '{U}', cmc: 3, colorIdentity: ['U'] })],
      ['b_card', card('b_card', 'B card', { types: ['Creature'], supertypes: [], manaCost: '{B}', cmc: 3, colorIdentity: ['B'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['island', card('island', 'Island', { subtypes: ['Island'] })],
      ['swamp', card('swamp', 'Swamp', { subtypes: ['Swamp'] })],
    ]);
    // 16 W + 3 U + 1 B = 20 pips. W=80%, U=15%, B=5%. B below 15%, dropped.
    const d = deck([
      { oracleId: 'w_card', count: 16 },
      { oracleId: 'u_card', count: 3 },
      { oracleId: 'b_card', count: 1 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.basicsByColor.B).toBeUndefined();
    expect(plan.basicsByColor.W).toBeGreaterThan(0);
    expect(plan.basicsByColor.U).toBeGreaterThanOrEqual(0);
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.U ?? 0);
    expect(total).toBe(17);
  });
});

describe('computeLandFill — existing dual lands', () => {
  it('4 W/G duals reduce basics added and shift distribution', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 3, colorIdentity: ['W'] })],
      ['g_card', card('g_card', 'G card', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 3, colorIdentity: ['G'] })],
      ['dual', card('dual', 'Sunpetal Grove', { types: ['Land'], supertypes: [], typeLine: 'Land', colorIdentity: ['W', 'G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    // 11 W + 11 G spells (50/50) + 4 duals already in deck.
    const d = deck([
      { oracleId: 'w_card', count: 11 },
      { oracleId: 'g_card', count: 11 },
      { oracleId: 'dual', count: 4 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    // baseLandCount=17. With 4 non-basic lands, basicsNeeded = 13.
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.G ?? 0);
    expect(total).toBe(13);
    // Duals contribute to both W and G equally so distribution stays balanced.
    expect(plan.basicsByColor.W).toBeGreaterThanOrEqual(6);
    expect(plan.basicsByColor.G).toBeGreaterThanOrEqual(6);
  });
});

describe('computeLandFill — curve adjustment', () => {
  it('avg CMC > 3.5 adds 1 land', () => {
    const cards = new Map<string, Card>([
      ['titan', card('titan', 'Big Titan', { types: ['Creature'], supertypes: [], manaCost: '{4}{R}', cmc: 5, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'titan', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    expect(plan.basicsByColor.R).toBe(18); // 17 + 1
  });

  it('avg CMC < 2.5 drops 1 land', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'bolt', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.basicsByColor.R).toBe(16); // 17 - 1
  });
});

describe('computeLandFill — idempotency', () => {
  it('rerunning on the result of applying its own plan produces empty add/remove', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['g_card', card('g_card', 'G card', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 1, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    const start = deck([
      { oracleId: 'w_card', count: 11 },
      { oracleId: 'g_card', count: 11 },
    ]);
    const first = computeLandFill(start, cards);
    // Apply the plan manually for the test.
    const applied: typeof start = {
      ...start,
      workingCards: [...start.workingCards, ...first.add],
    };
    const second = computeLandFill(applied, cards);
    expect(second.add).toEqual([]);
    expect(second.remove).toEqual([]);
  });
});
