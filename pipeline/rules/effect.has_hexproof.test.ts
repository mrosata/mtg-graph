import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_hexproof';
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

describe('effect.has_hexproof', () => {
  it.each([
    [['Hexproof'], 'Hexproof'],
    [['Hexproof', 'Vigilance'], 'Hexproof, vigilance'],
    [['Flying', 'Hexproof'], 'Flying, hexproof'],
  ])('matches when keyword Hexproof is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Indestructible']],
    [['Haste']],
  ])('does not match when keywords lack Hexproof: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire when Hexproof appears only inside a grant clause', () => {
    const c = card(['Hexproof'], 'target creature gains hexproof until end of turn.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });

  // v0.14.15 — Niv-Mizzet, Guildpact: "Flying, hexproof from multicolored".
  // Scryfall's keywords array lists both 'Hexproof from' AND 'Hexproof'; the
  // intrinsic check needs to accept the qualified form on the keyword line.
  it('matches "hexproof from X" qualified intrinsic', () => {
    const c = card(['Flying', 'Hexproof from', 'Hexproof'], 'Flying, hexproof from multicolored\nWhenever this creature attacks, draw a card.');
    expect(rule.matchCard!(c, '')).toBeTruthy();
  });
});
