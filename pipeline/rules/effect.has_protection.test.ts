// pipeline/rules/effect.has_protection.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_protection';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_protection', () => {
  it.each([
    // Progenitus — "Protection from everything"
    [['Protection'], 'Protection from everything'],
    // Stock printed "Protection from <color>"
    [['Protection'], 'Protection from black'],
    // Multi-protection chain on one keyword line — printed as comma-separated
    // keyword block, each entry of form "protection from X".
    [['Protection', 'Flying'], 'Flying\nProtection from red, protection from green'],
    // Protection from a noun type
    [['Protection'], 'Protection from creatures'],
  ])('matches when keyword Protection is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    // No Protection keyword on card
    [[], ''],
    [['Menace'], 'Menace'],
    [['Flying'], 'Flying'],
  ])('does not match when keywords lack Protection: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBe(false);
  });

  it('does not fire when Protection appears only inside a grant clause', () => {
    // Scryfall flags `Protection` in keywords because of the grant text, but
    // there's no standalone keyword-block line — only a prose grant. Should NOT
    // fire on the printed-keyword axis (that's effect.grants_protection).
    const c = card(['Protection'], 'equipped creature has protection from creatures.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
