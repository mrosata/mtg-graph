import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_trample';
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

describe('effect.has_trample', () => {
  // v0.43.0 — after isIntrinsicKeyword guard, positive rows must include
  // realistic intrinsic-keyword oracle text so the guard fires correctly.
  it.each([
    [['Trample'], 'Trample'],
    [['Flying', 'Trample'], 'Flying, trample'],
    [['Trample', 'Vigilance'], 'Trample, vigilance'],
  ])('matches when keyword Trample is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  // Multi-line keyword block
  it('matches multi-line keyword block containing Trample', () => {
    const text = 'Vigilance\nTrample';
    expect(rule.matchCard!(card(['Trample', 'Vigilance'], text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Lifelink', 'Deathtouch']],
  ])('does not match when keywords lack Trample: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  // Regression: Charging Hooligan — conditional self-grant ("this creature
  // gains trample until end of turn") is NOT intrinsic. effect.grants_trample
  // handles that case.
  it('does not fire from grant clauses alone (oracle text only, no Scryfall keyword)', () => {
    const c = card([], 'if a rat is attacking, this creature gains trample until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('does not fire from anthem grants', () => {
    const c = card([], 'other creatures you control have trample');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  // v0.43.0 — token-grant FP guard: "create a 4/4 colorless beast creature
  // token with trample" puts Trample in Scryfall's keywords array but
  // isIntrinsicKeyword should NOT fire because 'trample' appears in a prose
  // line (contains the word "create" / has other keywords after comma / no
  // standalone keyword-block line structure).
  it('does not fire when Trample appears only in a token-grant clause', () => {
    const c = card(['Trample'], 'create a 4/4 colorless beast creature token with trample.');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('returns the matched keyword as evidence', () => {
    const text = 'Trample';
    expect(rule.matchCard!(card(['Trample'], text), text.toLowerCase())).toEqual({ evidence: 'Trample' });
  });
});
