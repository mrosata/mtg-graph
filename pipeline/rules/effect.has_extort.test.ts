import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_extort';
import type { Card } from '../../shared/types';

function card(keywords: string[]): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_extort', () => {
  it.each([
    // keyword line, reminder text already stripped
    ['extort'],
    // keyword block with other keywords (The Kingpin of Crime shape)
    ['flying, extort'],
    // keyword line followed by other rules text (Crypt Ghast shape)
    ['extort whenever a swamp is tapped for mana, its controller adds an additional {b}.'],
  ])('matches text: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // word boundary: "extortion" must NOT match
    ['the extortion racket demands payment.'],
    ['flying, lifelink'],
    ['whenever you cast a spell, each opponent loses 1 life.'],
  ])('does not match text: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matches on the Extort keyword via matchCard', () => {
    expect(rule.matchCard!(card(['Extort']), '')).toBeTruthy();
  });

  it('does not match unrelated keywords via matchCard', () => {
    expect(rule.matchCard!(card(['Flying', 'Lifelink']), '')).toBe(false);
    expect(rule.matchCard!(card([]), '')).toBe(false);
  });
});
