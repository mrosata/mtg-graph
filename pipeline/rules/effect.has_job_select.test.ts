import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_job_select';
import type { Card } from '../../shared/types';

function card(keywords: string[]): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Artifact — Equipment',
    types: ['Artifact'], subtypes: ['Equipment'], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_job_select', () => {
  it.each([[['Job select']], [['Job select', 'Equip']]])('matches: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([[[]], [['Equip']], [['Crew']]])('does not match: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });
});
