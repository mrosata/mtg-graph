// pipeline/rules/condition.has_x_in_cost.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.has_x_in_cost';
import type { Card } from '../../shared/types';

function card(manaCost: string | null, typeLine = 'Sorcery'): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost, cmc: 0, colors: [], colorIdentity: [], typeLine,
    types: typeLine.split(/[\s—//]+/).filter(Boolean),
    subtypes: [], supertypes: [], oracleText: '',
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('condition.has_x_in_cost', () => {
  it.each([
    ['{X}{X}{U}{U}', 'Sorcery'],           // Mathemagics
    ['{X}{G}{U}', 'Sorcery'],              // Mind into Matter
    ['{X}{X}{X}{G}{U}', 'Sorcery'],        // Doppelgang
    ['{X}{R}', 'Instant'],                 // Stonesplitter Bolt
    ['{X}{3}{W}', 'Sorcery'],              // Abuelo's Awakening
    ['{X}{U}', 'Creature — Wizard'],       // Ingenious Prodigy — creatures with X count too
    ['{U} // {X}{G}', 'Creature — Otter // Sorcery — Adventure'], // adventure back face
  ])('matches cards with {X} in mana cost: %s / %s', (manaCost, typeLine) => {
    expect(rule.matchCard!(card(manaCost, typeLine), '')).toBeTruthy();
  });

  it.each([
    ['{1}{U}{U}', 'Sorcery'],              // No X
    ['{2}{G}', 'Creature — Druid'],
    ['{R}', 'Instant'],
    [null, 'Land'],                        // Lands have no mana cost
    ['{0}', 'Artifact'],
  ])('does not match cards without {X}: %s / %s', (manaCost, typeLine) => {
    expect(rule.matchCard!(card(manaCost, typeLine), '')).toBe(false);
  });

  it('returns the X marker as evidence', () => {
    const result = rule.matchCard!(card('{X}{X}{U}{U}', 'Sorcery'), '');
    expect(result).toMatchObject({ evidence: '{X}' });
  });
});
