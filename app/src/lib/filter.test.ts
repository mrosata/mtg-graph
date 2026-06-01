import { describe, it, expect } from 'vitest';
import { applyFilter, type Filter } from './filter';
import type { Card } from '@shared/types';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

describe('applyFilter', () => {
  it('returns all cards when filter is empty', () => {
    const cards = [card({ oracleId: 'a' }), card({ oracleId: 'b' })];
    expect(applyFilter(cards, {})).toHaveLength(2);
  });

  it('with one color selected, keeps only mono cards of that color', () => {
    const cards = [
      card({ oracleId: 'mono_red', colors: ['R'] }),
      card({ oracleId: 'mono_blue', colors: ['U'] }),
      card({ oracleId: 'colorless', colors: [] }),
      card({ oracleId: 'izzet', colors: ['R', 'U'] }),
    ];
    const result = applyFilter(cards, { colors: ['R'] });
    expect(result.map((c) => c.oracleId)).toEqual(['mono_red']);
  });

  it('with multiple colors selected, keeps cards whose colors are a non-empty subset of the selection', () => {
    const cards = [
      card({ oracleId: 'mono_red', colors: ['R'] }),
      card({ oracleId: 'mono_blue', colors: ['U'] }),
      card({ oracleId: 'mono_green', colors: ['G'] }),
      card({ oracleId: 'izzet', colors: ['R', 'U'] }),
      card({ oracleId: 'gruul', colors: ['R', 'G'] }),
      card({ oracleId: 'colorless', colors: [] }),
    ];
    const result = applyFilter(cards, { colors: ['R', 'U'] });
    expect(result.map((c) => c.oracleId)).toEqual(['mono_red', 'mono_blue', 'izzet']);
  });

  it('filters by cmcMax', () => {
    const cards = [
      card({ oracleId: 'one', cmc: 1 }),
      card({ oracleId: 'five', cmc: 5 }),
    ];
    expect(applyFilter(cards, { cmcMax: 3 }).map((c) => c.oracleId)).toEqual(['one']);
  });

  it('filters by type (substring on type line)', () => {
    const cards = [
      card({ oracleId: 'creature', types: ['Creature'] }),
      card({ oracleId: 'instant', types: ['Instant'] }),
    ];
    expect(applyFilter(cards, { types: ['Creature'] }).map((c) => c.oracleId))
      .toEqual(['creature']);
  });

  it('filters by oracle text contains (case-insensitive)', () => {
    const cards = [
      card({ oracleId: 'a', oracleText: 'Whenever a creature enters' }),
      card({ oracleId: 'b', oracleText: 'Sacrifice a permanent' }),
    ];
    expect(applyFilter(cards, { text: 'creature' }).map((c) => c.oracleId)).toEqual(['a']);
  });

  it('filters by set (matches against printings)', () => {
    const cards = [
      card({ oracleId: 'a', set: 'blb', printings: ['blb'] }),
      card({ oracleId: 'b', set: 'fdn', printings: ['fdn'] }),
      card({ oracleId: 'c', set: 'blb', printings: ['blb', 'fdn'] }),
    ];
    expect(applyFilter(cards, { sets: ['fdn'] }).map((c) => c.oracleId))
      .toEqual(['b', 'c']);
  });

  describe('scope', () => {
    const cards = [
      card({ oracleId: 'std', printings: ['blb'] }),
      card({ oracleId: 'preview', printings: ['hob'] }),
      card({ oracleId: 'reprint', printings: ['blb', 'hob'] }),
      card({ oracleId: 'unknown', printings: ['xyz'] }),
    ];

    it('scope undefined → no scope filtering', () => {
      expect(applyFilter(cards, {}).map((c) => c.oracleId))
        .toEqual(['std', 'preview', 'reprint', 'unknown']);
    });

    it("scope 'standard' keeps cards with any printing in a Standard set", () => {
      expect(applyFilter(cards, { scope: 'standard' }).map((c) => c.oracleId))
        .toEqual(['std', 'reprint']);
    });

    it("scope 'unreleased' keeps cards with any printing in an upcoming set", () => {
      expect(applyFilter(cards, { scope: 'unreleased' }).map((c) => c.oracleId))
        .toEqual(['preview', 'reprint']);
    });

    it("scope 'unreleased' excludes basic lands even if they have an upcoming printing", () => {
      const withBasic = [
        ...cards,
        card({
          oracleId: 'basic_plains',
          printings: ['blb', 'hob'],
          types: ['Land'],
          supertypes: ['Basic'],
        }),
      ];
      expect(applyFilter(withBasic, { scope: 'unreleased' }).map((c) => c.oracleId))
        .toEqual(['preview', 'reprint']);
    });

    it("scope 'all' applies no scope filter", () => {
      expect(applyFilter(cards, { scope: 'all' }).map((c) => c.oracleId))
        .toEqual(['std', 'preview', 'reprint', 'unknown']);
    });
  });

  describe('includeCommander', () => {
    // woc is a real commander code; blb is a real expansion code.
    const cards = [
      card({ oracleId: 'expansion_only', printings: ['blb'] }),
      card({ oracleId: 'commander_only', printings: ['woc'] }),
      card({ oracleId: 'reprint_both', printings: ['blb', 'woc'] }),
    ];

    it('default (undefined) hides cards whose printings are entirely in commander sets', () => {
      expect(applyFilter(cards, {}).map((c) => c.oracleId))
        .toEqual(['expansion_only', 'reprint_both']);
    });

    it('false hides cards whose printings are entirely in commander sets', () => {
      expect(applyFilter(cards, { includeCommander: false }).map((c) => c.oracleId))
        .toEqual(['expansion_only', 'reprint_both']);
    });

    it('true keeps commander-only cards', () => {
      expect(applyFilter(cards, { includeCommander: true }).map((c) => c.oracleId))
        .toEqual(['expansion_only', 'commander_only', 'reprint_both']);
    });
  });

  it('returns all cards when sets filter is empty array', () => {
    const cards = [
      card({ oracleId: 'a', set: 'blb', printings: ['blb'] }),
      card({ oracleId: 'b', set: 'fdn', printings: ['fdn'] }),
    ];
    expect(applyFilter(cards, { sets: [] })).toHaveLength(2);
  });

  it('filters by tag id (requires single tag match)', () => {
    const cards = [
      card({ oracleId: 'a', tags: [{ tagId: 'effect.create_token', axis: 'effect', evidence: '' }] }),
      card({ oracleId: 'b', tags: [{ tagId: 'effect.deals_damage', axis: 'effect', evidence: '' }] }),
      card({ oracleId: 'c', tags: [] }),
    ];
    expect(applyFilter(cards, { tags: ['effect.create_token'] }).map((c) => c.oracleId))
      .toEqual(['a']);
  });

  it('filters by tag id with AND semantics across multiple tags', () => {
    const cards = [
      card({
        oracleId: 'both',
        tags: [
          { tagId: 'effect.create_token', axis: 'effect', evidence: '' },
          { tagId: 'effect.deals_damage', axis: 'effect', evidence: '' },
        ],
      }),
      card({
        oracleId: 'only_token',
        tags: [{ tagId: 'effect.create_token', axis: 'effect', evidence: '' }],
      }),
      card({
        oracleId: 'only_damage',
        tags: [{ tagId: 'effect.deals_damage', axis: 'effect', evidence: '' }],
      }),
    ];
    expect(
      applyFilter(cards, { tags: ['effect.create_token', 'effect.deals_damage'] }).map((c) => c.oracleId),
    ).toEqual(['both']);
  });

  it('combines filters with AND semantics', () => {
    const cards = [
      card({ oracleId: 'rcreature', colors: ['R'], cmc: 2, types: ['Creature'] }),
      card({ oracleId: 'rinstant', colors: ['R'], cmc: 2, types: ['Instant'] }),
      card({ oracleId: 'bcreature', colors: ['B'], cmc: 2, types: ['Creature'] }),
    ];
    const f: Filter = { colors: ['R'], types: ['Creature'] };
    expect(applyFilter(cards, f).map((c) => c.oracleId)).toEqual(['rcreature']);
  });

  it('filters by name substring (case-insensitive)', () => {
    const cards = [
      card({ oracleId: 'bolt', name: 'Lightning Bolt' }),
      card({ oracleId: 'chain', name: 'Chain Lightning' }),
      card({ oracleId: 'counter', name: 'Counterspell' }),
    ];
    expect(applyFilter(cards, { name: 'lightning' }).map((c) => c.oracleId))
      .toEqual(['bolt', 'chain']);
  });

  it('returns all cards when name filter is empty string', () => {
    const cards = [card({ oracleId: 'a', name: 'Anything' })];
    expect(applyFilter(cards, { name: '' }).map((c) => c.oracleId)).toEqual(['a']);
  });

  it('combines name with other filters via AND', () => {
    const cards = [
      card({ oracleId: 'r_bolt', name: 'Lightning Bolt', colors: ['R'] }),
      card({ oracleId: 'u_bolt', name: 'Lightning Bolt of Mine', colors: ['U'] }),
    ];
    expect(applyFilter(cards, { name: 'lightning', colors: ['R'] }).map((c) => c.oracleId))
      .toEqual(['r_bolt']);
  });

  it('filters by cmcMin combined with cmcMax', () => {
    const cards = [
      card({ oracleId: 'one', cmc: 1 }),
      card({ oracleId: 'three', cmc: 3 }),
      card({ oracleId: 'five', cmc: 5 }),
    ];
    expect(applyFilter(cards, { cmcMin: 2, cmcMax: 4 }).map((c) => c.oracleId))
      .toEqual(['three']);
  });
});

describe('applyFilter with libraryFilter', () => {
  it('drops cards not present in the library set', () => {
    const cards = [
      card({ oracleId: 'a' }),
      card({ oracleId: 'b' }),
      card({ oracleId: 'c' }),
    ];

    const library = new Set(['a', 'c']);
    const out = applyFilter(cards, {}, library);

    expect(out.map((c) => c.oracleId).sort()).toEqual(['a', 'c']);
  });

  it('returns all cards when libraryFilter is undefined', () => {
    const cards = [card({ oracleId: 'a' }), card({ oracleId: 'b' })];
    const out = applyFilter(cards, {});
    expect(out).toHaveLength(2);
  });

  it('intersects with other filter criteria (AND semantics)', () => {
    const cards = [
      card({ oracleId: 'a', rarity: 'common' }),
      card({ oracleId: 'b', rarity: 'rare' }),
      card({ oracleId: 'c', rarity: 'common' }),
    ];
    const out = applyFilter(cards, { rarities: ['common'] }, new Set(['a', 'b']));
    expect(out.map((c) => c.oracleId)).toEqual(['a']);
  });
});
