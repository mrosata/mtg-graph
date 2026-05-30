import { describe, it, expect } from 'vitest';
import { rule } from './effect.is_instant_or_sorcery';
import type { Card } from '../../shared/types';

function mk(typeLine: string): Card {
  return {
    oracleId: 'x',
    name: 'X',
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    typeLine,
    types: typeLine.split(/[—-]/)[0]!.trim().split(/\s+/),
    subtypes: [],
    manaCost: '',
    keywords: [],
    colors: [],
    colorIdentity: [],
    oracleText: '',
    imageUrl: '',
    legalities: {},
  } as unknown as Card;
}

describe('effect.is_instant_or_sorcery', () => {
  it('matches Instants', () => {
    expect(rule.matchCard!(mk('Instant'), '')).toBeTruthy();
  });
  it('matches Sorceries', () => {
    expect(rule.matchCard!(mk('Sorcery'), '')).toBeTruthy();
  });
  it('matches Tribal Instants', () => {
    expect(rule.matchCard!(mk('Tribal Instant — Faerie'), '')).toBeTruthy();
  });
  it('does not match Creatures', () => {
    expect(rule.matchCard!(mk('Creature — Elemental'), '')).toBe(false);
  });
  it('does not match Lands', () => {
    expect(rule.matchCard!(mk('Basic Land — Island'), '')).toBe(false);
  });
  it('does not match Enchantments', () => {
    expect(rule.matchCard!(mk('Enchantment — Aura'), '')).toBe(false);
  });
});
