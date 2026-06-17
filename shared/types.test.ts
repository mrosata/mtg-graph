// shared/types.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Card, CardTag, TagDef, InteractionEdge, Color, Face, CardLayout } from './types';

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

  it('Face contains per-face fields', () => {
    const f: Face = {
      name: 'Peter Parker',
      typeLine: 'Legendary Creature — Human Scientist Hero',
      types: ['Creature'],
      subtypes: ['Human', 'Scientist', 'Hero'],
      supertypes: ['Legendary'],
      oracleText: 'When Peter Parker enters...',
      manaCost: '{1}{W}',
      colors: ['W'],
      power: '0',
      toughness: '1',
      imageUrl: 'https://example.test/front.jpg',
    };
    expect(f.name).toBe('Peter Parker');
  });

  it('Card.layout and Card.faces are both optional and compile together', () => {
    const c: Card = {
      oracleId: 'x', name: 'Peter Parker // Amazing Spider-Man',
      set: 'spm', printings: ['spm'], collectorNumber: '10',
      manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
      typeLine: 'Legendary Creature', types: ['Creature'],
      subtypes: ['Human'], supertypes: ['Legendary'],
      oracleText: 'front\n\nback', keywords: ['Transform'],
      power: '0', toughness: '1', rarity: 'mythic',
      imageUrl: 'https://example.test/front.jpg',
      layout: 'modal_dfc',
      faces: [
        // shape only — minimal Face
        { name: 'Peter Parker', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: null, colors: [], power: null, toughness: null },
        { name: 'Amazing Spider-Man', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: null, colors: [], power: null, toughness: null },
      ],
      tags: [],
    };
    const layout: CardLayout | undefined = c.layout;
    expect(layout).toBe('modal_dfc');
    expect(c.faces?.length).toBe(2);
  });

  it('CardTag.face is an optional front/back marker', () => {
    const t: CardTag = { tagId: 'effect.has_flying', axis: 'effect', evidence: 'flying', face: 'back' };
    expect(t.face).toBe('back');
  });
});
