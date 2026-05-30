import { describe, it, expect } from 'vitest';
import { hasNearMiss, buildRuleCoverage } from './coverage-report';
import type { Card } from '../../shared/types';
import type { Rule } from '../rules/types';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: '1', toughness: '1',
    rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

describe('buildRuleCoverage', () => {
  it('runs matchCard-only rules without calling match', () => {
    const cards: Card[] = [
      card({ oracleId: 'a', name: 'Hasty Bear', keywords: ['Haste'] }),
      card({ oracleId: 'b', name: 'Plain Bear', keywords: [] }),
    ];
    const rule: Rule = {
      id: 'effect.has_haste_intrinsic',
      axis: 'effect',
      matchCard: (c) => (c.keywords.includes('Haste') ? { evidence: 'Haste' } : false),
    };
    const result = buildRuleCoverage(cards, rule);
    expect(result.matches).toBe(1);
    expect(result.matchSample.map((s) => s.name)).toContain('Hasty Bear');
  });

  it('runs match-only rules', () => {
    const cards: Card[] = [
      card({ oracleId: 'a', name: 'Drawer', oracleText: 'Draw a card.' }),
      card({ oracleId: 'b', name: 'Pumper', oracleText: 'Target creature gets +1/+1.' }),
    ];
    const rule: Rule = {
      id: 'effect.draws',
      axis: 'effect',
      match: (t) => (t.includes('draw a card') ? { evidence: 'draw a card' } : false),
    };
    const result = buildRuleCoverage(cards, rule);
    expect(result.matches).toBe(1);
    expect(result.matchSample.map((s) => s.name)).toContain('Drawer');
  });
});

describe('hasNearMiss', () => {
  it('finds an anchor within window of a proximity term', () => {
    expect(hasNearMiss('destroy target creature', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(true);
  });
  it('rejects when anchor and proximity are too far apart', () => {
    const text = 'destroy ' + 'foo '.repeat(20) + 'creature';
    expect(hasNearMiss(text, { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(false);
  });
  it('finds anchor either side of proximity', () => {
    expect(hasNearMiss('creatures you control destroy', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(true);
  });
  it('returns false when neither anchor nor proximity appears', () => {
    expect(hasNearMiss('draw a card', { anchors: ['destroy'], proximity: ['creature'], window: 8 })).toBe(false);
  });
});
