// pipeline/rules/effect.has_saddle.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_saddle';
import type { Card } from '../../shared/types';

function mk(o: Partial<Card> & { name: string }): Card {
  return {
    name: o.name,
    oracleId: 'test-' + o.name,
    set: 'OTJ',
    collectorNumber: '1',
    printings: ['OTJ'],
    typeLine: o.typeLine ?? 'Creature — Horse Mount',
    manaCost: o.manaCost ?? '{1}{R}',
    cmc: o.cmc ?? 2,
    colors: o.colors ?? ['R'],
    colorIdentity: o.colorIdentity ?? ['R'],
    keywords: o.keywords ?? [],
    oracleText: o.oracleText ?? '',
    power: o.power ?? '2',
    toughness: o.toughness ?? '2',
    imageUrl: '',
  } as Card;
}

describe('effect.has_saddle', () => {
  it('matches when Saddle is in card.keywords', () => {
    const c = mk({
      name: 'Bounding Felidar',
      keywords: ['Saddle'],
      oracleText: 'Whenever this creature attacks while saddled, put a +1/+1 counter on each other creature you control.\nSaddle 2',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBeTruthy();
  });

  it('matches when Saddle is paired with another keyword', () => {
    const c = mk({
      name: 'Bridled Bighorn',
      keywords: ['Saddle', 'Vigilance'],
      oracleText: 'Vigilance\nSaddle 2',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBeTruthy();
  });

  it('does not match when Saddle keyword is absent', () => {
    // A card that mentions "saddle" only in flavor / payoff text without
    // having the Saddle keyword itself.
    const c = mk({
      name: 'Imaginary Mount Lord',
      keywords: ['Flying'],
      oracleText: 'Mounts you control have flying.',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });

  it('does not match non-Mount cards without Saddle keyword', () => {
    const c = mk({
      name: 'Plain Creature',
      typeLine: 'Creature — Goblin',
      keywords: [],
      oracleText: 'Haste',
    });
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
