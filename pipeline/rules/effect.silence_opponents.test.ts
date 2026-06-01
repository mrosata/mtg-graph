// pipeline/rules/effect.silence_opponents.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.silence_opponents';

describe('effect.silence_opponents', () => {
  it.each([
    // Canonical "opponents can't cast spells" silence/hate piece.
    // Grand Abolisher.
    ["during your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments"],
    // Kutzil / Voice of Victory / Dragonlord Dromoka.
    ["your opponents can't cast spells during your turn"],
    // Drannith Magistrate.
    ["your opponents can't cast spells from anywhere other than their hands"],
    // Conqueror's Flail (equipment-conditional silence).
    ["as long as this equipment is attached to a creature, your opponents can't cast spells during your turn"],
    // "Can't activate" variant — Cursed Totem / Stony Silence family.
    ["your opponents can't activate abilities of artifacts"],
    ["opponents can't activate abilities of creatures"],
    // Singular "an opponent can't cast" — same axis, narrower scope.
    ["an opponent can't cast spells"],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Different axis — the controller's restriction on themselves, not on
    // opponents. Doesn't fit the hate-piece axis.
    ["you can't cast spells"],
    // Conditional cost reduction — not a silence.
    ["spells cost {1} less to cast"],
    // Counter (responsive), not silence (static restriction).
    ["counter target spell"],
    // Generic card text.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
