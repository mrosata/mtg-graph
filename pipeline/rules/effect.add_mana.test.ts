import { describe, it, expect } from 'vitest';
import { rule } from './effect.add_mana';
import type { Card } from '../../shared/types';

function card(typeLine: string, subtypes: string[], types: string[] = ['Land']): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine,
    types, subtypes, supertypes: [], oracleText: '',
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.add_mana', () => {
  it.each([
    ['add {g}'],
    ['{t}: add {c}'],
    ['add one mana of any color'],
    ['add three mana in any combination of colors'],
    ['when this enters, add {2}'],
    ['add {w}{u}'],
    ['add {r}{r}'],
    ['add two mana of any one color'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['spend this mana only to cast creature spells'],
    ['this spell costs {1} less to cast'],
    ['draw a card'],
    ["you may pay {2} rather than pay this spell's mana cost"],
    ['target creature gets +1/+1'],
    ['mana cost has no effect on this'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Basic lands and dual-basic-type lands (shocklands, surveil lands, etc.)
  // grant their mana ability via the basic land subtype. Oracle text is
  // either empty (basics) or reminder-only (shocklands), so the text rule
  // never sees it. The matchCard fallback catches these structurally.
  it.each([
    ['Plains', ['Plains']],
    ['Island', ['Island']],
    ['Swamp', ['Swamp']],
    ['Mountain', ['Mountain']],
    ['Forest', ['Forest']],
    ['Forest Island', ['Forest', 'Island']],
    ['Mountain Plains', ['Mountain', 'Plains']],
  ])('matchCard fallback: land with basic subtype "%s"', (typeLine, subtypes) => {
    expect(rule.matchCard!(card(typeLine, subtypes), '')).toBeTruthy();
  });

  it.each([
    ['Land', []],
    ['Land — Cave', ['Cave']],
  ])('matchCard fallback ignores lands without basic subtype: "%s"', (typeLine, subtypes) => {
    expect(rule.matchCard!(card(typeLine, subtypes), '')).toBe(false);
  });

  it('matchCard does not fire on non-land cards', () => {
    expect(rule.matchCard!(card('Creature — Human', [], ['Creature']), '')).toBe(false);
  });
});
