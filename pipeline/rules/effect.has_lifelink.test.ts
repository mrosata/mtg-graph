import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_lifelink';
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

describe('effect.has_lifelink', () => {
  it.each([
    [['Lifelink'], 'Lifelink'],
    [['Flying', 'Lifelink'], 'Flying, lifelink'],
    [['Lifelink', 'Trample'], 'Lifelink\nTrample'],
  ])('matches when keyword Lifelink is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Deathtouch']],
  ])('does not match when keywords lack Lifelink: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from anthem grants alone', () => {
    const c = card([], 'other creatures you control have lifelink');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('does not fire from temporary grants alone', () => {
    const c = card([], 'target creature gains lifelink until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  // v0.22.0 — Reluctant Role Model: "put a flying, lifelink, or +1/+1 counter
  // on it". Lifelink appears inside a counter-list, not on an intrinsic
  // keyword-block line. Scryfall puts Lifelink in `keywords` because the
  // word appears in oracle text; the isIntrinsicKeyword gate filters this.
  it('does not fire when Lifelink appears only inside a counter-list grant', () => {
    const c = card(
      ['Lifelink'],
      'survival — at the beginning of your second main phase, if this creature is tapped, put a flying, lifelink, or +1/+1 counter on it.',
    );
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
