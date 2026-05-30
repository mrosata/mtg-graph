import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_ward';
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

describe('effect.has_ward', () => {
  it.each([
    [['Ward'], 'Ward {2}'],
    [['Flying', 'Ward'], 'Flying\nWard {2}'],
    [['Ward'], 'Flash\nWard {2}\nThis creature enters tapped unless it\'s your turn.'],
    // Numbered cost suffixes after stripping
    [['Ward'], 'Ward {3}'],
    // Em-dash cost form: Ward—<action> (e.g. Axebane Ferox)
    [['Ward'], 'deathtouch, haste\nward—collect evidence 4.'],
    [['Ward'], 'ward—pay 3 life.'],
  ])('matches when keyword Ward is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Hexproof']],
  ])('does not match when keywords lack Ward: %j', (kw) => {
    expect(rule.matchCard!(card(kw), ''), '').toBe(false);
  });

  it('does not match a granted-ability quote containing ward (stripped pre-rule)', () => {
    // Granted-ability quotes are stripped by normalizeOracleText before rules run,
    // so a card that only mentions ward inside quotes should NOT match.
    // Simulate: keywords has no 'Ward', text has no standalone ward line.
    const c = card(['Flying'], 'flying');
    expect(rule.matchCard!(c, 'flying')).toBe(false);
  });
});
