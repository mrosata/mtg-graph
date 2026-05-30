import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_disguise';
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

describe('effect.has_disguise', () => {
  it.each([
    // Scryfall keyword guard fires alone — the canonical path
    [['Disguise'], 'disguise {4}{b}'],
    [['Flying', 'Lifelink', 'Ward', 'Disguise'], 'flying, lifelink, ward {2} disguise {x}{3}{w}'],
    // Costless-land form (Branch of Vitu-Ghazi)
    [['Disguise'], '{t}: add {c}. disguise {3}'],
    // Numeric cost (Bolrac-Clan Basher)
    [['Disguise'], 'double strike, trample disguise {3}{r}{r}'],
    // Sanity: keyword without disguise text — keyword array is authoritative; should still fire
    [['Disguise'], ''],
  ])('matches when keyword Disguise is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text)).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Cloak']],
    [['Manifest']],
  ])('does not match when keywords lack Disguise: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not match a flavor-text mention of disguise without the printed keyword', () => {
    const c = card(['Flying'], 'flying. the rogue donned a disguise.');
    expect(rule.matchCard!(c, 'flying. the rogue donned a disguise.')).toBe(false);
  });
});
