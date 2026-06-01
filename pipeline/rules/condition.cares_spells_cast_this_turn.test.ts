// pipeline/rules/condition.cares_spells_cast_this_turn.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_spells_cast_this_turn';

describe('condition.cares_spells_cast_this_turn', () => {
  it.each([
    // Ordinal triggers
    ['whenever you cast your second spell each turn, this creature gets +1/+1'],
    ['whenever you cast your first instant or sorcery spell each turn, draw a card'],
    ['whenever you cast your third spell this turn, return target creature'],
    // Opponent variant
    ['whenever an opponent casts their second spell each turn, you draw a card'],
    // Threshold gates
    ["if you've cast two or more spells this turn, draw a card"],
    ["if you've cast three or more instant or sorcery spells this turn, this creature gets +3/+3"],
    // Scaling
    ["draw cards equal to the number of spells you've cast this turn"],
    ["__self__'s power is equal to the number of spells you've cast this turn"],
    // Compound gate (Eshki Dragonclaw)
    ["if you've cast a creature spell and a noncreature spell this turn, you may pay {0} instead"],
    // Compound gate with explicit "both" (Eshki Dragonclaw verbatim)
    ["if you've cast both a creature spell and a noncreature spell this turn, draw a card"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Per-spell trigger (no count) — handled by trigger.spell_cast
    ['whenever you cast a spell, draw a card'],
    // Per-creature trigger
    ['whenever you cast a creature spell, put a +1/+1 counter on it'],
    // Magecraft-shaped per-spell (no count/ordinal)
    ['whenever you cast or copy an instant or sorcery spell, this creature gets +1/+1 until end of turn'],
    // Static "cannot cast spells"
    ["players can't cast spells"],
    // Reference to "last turn"
    ['return target instant or sorcery card cast last turn from your graveyard to your hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
