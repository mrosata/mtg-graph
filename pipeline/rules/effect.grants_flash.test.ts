// pipeline/rules/effect.grants_flash.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.grants_flash';

describe('effect.grants_flash', () => {
  it.each([
    // High Fae Trickster / Final-Word Phantom — global license.
    ['you may cast spells as though they had flash.'],
    // Valley Floodcaller — typed-spell license.
    ['you may cast noncreature spells as though they had flash.'],
    // Whirlwing Stormbrood / Dynamic Soar — chained-type license.
    ['you may cast sorcery spells and dragon spells as though they had flash.'],
    // Teferi -1 / Teferi, Time Raveler — sorcery license with time qualifier.
    ['until your next turn, you may cast sorcery spells as though they had flash.'],
    // Alchemist's Refuge — activated license.
    ['{g}{u}, {t}: you may cast spells this turn as though they had flash.'],
    // Singer of Swift Rivers — tribal-spell license.
    ['you may cast merfolk spells as though they had flash.'],
    // Progenitor's Icon — single-spell-this-turn license.
    ['the next spell of the chosen type you cast this turn can be cast as though it had flash.'],
  ])('matches grants-flash licenses: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self-only flash via "this spell" — covered by effect.has_flash (cost-modified
    // flash on the card itself), must NOT fire as a grant to others.
    ['you may cast this spell as though it had flash if you pay {2} more to cast it.'],
    ['you may cast this spell as though it had flash.'],
    ['you may cast this spell as though it had flash if a creature is attacking and a creature is blocking.'],
    // Plain printed flash (the keyword line) — different axis (has_flash).
    ['flash'],
    // Flash reminder text — not a grant.
    ['flash (you may cast this spell any time you could cast an instant.)'],
    // Unrelated grant — different keyword.
    ['creatures you control gain trample until end of turn.'],
    // Unrelated draw.
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
