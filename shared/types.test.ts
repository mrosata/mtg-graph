// shared/types.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { Card, CardTag, TagDef, InteractionEdge, Color } from './types';

describe('shared types', () => {
  it('Color is the WUBRG union', () => {
    expectTypeOf<Color>().toEqualTypeOf<'W' | 'U' | 'B' | 'R' | 'G'>();
  });

  it('Card has required fields', () => {
    const c: Card = {
      oracleId: 'x', name: 'x', set: 'x', printings: ['x'], collectorNumber: '1',
      manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: '', keywords: [], power: null, toughness: null,
      rarity: 'common', imageUrl: '', tags: [],
    };
    expectTypeOf(c.tags).toEqualTypeOf<CardTag[]>();
  });
});
