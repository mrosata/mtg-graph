// pipeline/rules/effect.cast_noncreature_spell.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_noncreature_spell';
import type { Card } from '../../shared/types';

function card(typeLine: string, types: string[] = []): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine,
    types, subtypes: [], supertypes: [], oracleText: '',
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.cast_noncreature_spell', () => {
  it.each([
    ['Instant', ['Instant']],
    ['Sorcery', ['Sorcery']],
    ['Instant — Arcane', ['Instant']],
    ['Sorcery — Lesson', ['Sorcery']],
    ['Tribal Instant — Elf', ['Tribal', 'Instant']],
  ])('matches single-faced %s cards', (typeLine, types) => {
    expect(rule.matchCard!(card(typeLine, types), '')).toBeTruthy();
  });

  it.each([
    ['Creature — Otter // Sorcery — Adventure'],
    ['Creature — Human Warrior // Instant — Adventure'],
  ])('matches adventure cards (creature front, instant/sorcery adventure back): %s', (typeLine) => {
    // adventures use the back face when cast as a spell — that's a noncreature spell cast
    expect(rule.matchCard!(card(typeLine, ['Creature']), '')).toBeTruthy();
  });

  it.each([
    ['Creature — Human', ['Creature']],
    ['Enchantment', ['Enchantment']],
    ['Artifact — Equipment', ['Artifact']],
    ['Land', ['Land']],
    ['Planeswalker — Jace', ['Planeswalker']],
    ['Enchantment — Room // Enchantment — Room', ['Enchantment']],
    ['Legendary Creature — Dragon', ['Creature']],
  ])('does not match non-spell card types: %s', (typeLine, types) => {
    expect(rule.matchCard!(card(typeLine, types), '')).toBe(false);
  });

  it('returns the matched type word as evidence', () => {
    const result = rule.matchCard!(card('Instant', ['Instant']), '');
    expect(result).toMatchObject({ evidence: expect.stringMatching(/Instant/i) });
  });
});
