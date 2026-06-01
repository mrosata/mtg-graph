import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_toxic';
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

describe('effect.has_toxic', () => {
  it.each([
    // Bloodroot Apothecary (current Standard): "Toxic 2" intrinsic.
    [['Toxic'], 'Toxic 2'],
    // Synthetic — Phyrexia: All Will Be One precedent.
    [['Toxic'], 'Toxic 1'],
    [['Toxic'], 'Toxic 3'],
    // Combined with other intrinsics on adjacent lines.
    [['Flying', 'Toxic'], 'Flying\nToxic 1'],
    [['Toxic', 'Trample'], 'Toxic 2\nTrample'],
  ])('matches when keyword Toxic N is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Deathtouch']],
    [['Infect']],            // infect is the adjacent old-school mechanic, NOT toxic
  ])('does not match when keywords lack Toxic: %j', (kw) => {
    expect(rule.matchCard!(card(kw), ''), '').toBe(false);
  });

  it('does not fire on a card without the Toxic keyword in keywords[] even if oracle mentions toxic', () => {
    // Scryfall would not populate Toxic in keywords[] without an intrinsic
    // toxic line, but guard the rule against bare prose mentions just in case.
    const c = card([], 'this creature is not toxic');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });

  it('does not fire when Toxic appears only inside a granted-quotes block', () => {
    // Granted-ability quotes are stripped pre-rule by normalizeOracleText, so
    // a card whose only Toxic reference is inside quotes won't have the
    // keyword populated. Smoke-check the rule still bails.
    const c = card(['Flying'], 'flying');
    expect(rule.matchCard!(c, 'flying')).toBe(false);
  });
});
