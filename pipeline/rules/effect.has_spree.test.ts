// pipeline/rules/effect.has_spree.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_spree';
import type { Card } from '../../shared/types';

function mk(o: Partial<Card> & { name: string }): Card {
  return {
    name: o.name,
    oracleId: 'test-' + o.name,
    set: 'OTJ',
    collectorNumber: '1',
    printings: ['OTJ'],
    typeLine: o.typeLine ?? 'Sorcery',
    manaCost: o.manaCost ?? '{1}{R}',
    cmc: o.cmc ?? 2,
    colors: o.colors ?? ['R'],
    colorIdentity: o.colorIdentity ?? ['R'],
    keywords: o.keywords ?? [],
    oracleText: o.oracleText ?? '',
    imageUrl: '',
  } as Card;
}

describe('effect.has_spree', () => {
  it('matches when Spree is in card.keywords', () => {
    const c = mk({
      name: 'Caught in the Crossfire',
      keywords: ['Spree'],
      oracleText: 'Spree\n+ {1} — Deals 2 damage to each outlaw creature.',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBeTruthy();
  });

  it('matches when Spree is alongside other keywords', () => {
    const c = mk({
      name: 'Three Steps Ahead',
      keywords: ['Spree', 'Flash'],
      oracleText: 'Flash\nSpree\n+ {1} — Counter target spell.',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBeTruthy();
  });

  it('does not match cards without the Spree keyword', () => {
    const c = mk({
      name: 'Plain Spell',
      keywords: ['Flash'],
      oracleText: 'Counter target spell.',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });

  it('does not match flavor uses of "spree" without the keyword', () => {
    const c = mk({
      name: 'Wild Spree',
      keywords: [],
      oracleText: 'The bandits went on a wild spree through town.',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
