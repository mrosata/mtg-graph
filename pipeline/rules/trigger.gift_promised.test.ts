import { describe, it, expect } from 'vitest';
import { rule } from './trigger.gift_promised';

describe('trigger.gift_promised', () => {
  it.each([
    // Jolly Gerbils — canonical fixture.
    ['whenever you give a gift, draw a card'],
    // Variants.
    ['whenever you give a gift, scry 1'],
    // Passive forms (less common, future-proof).
    ['whenever a gift is promised, you gain 2 life'],
    ['whenever the gift is promised, deal 1 damage to any target'],
    // Opponent-receives framing.
    ['whenever an opponent receives a gift, draw a card'],
    ['whenever a player receives a gift you gave, gain 1 life'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Has-gift producer — different axis (effect.has_gift).
    ['gift a treasure (you may promise an opponent a treasure as you cast this spell)'],
    // Generic give-something effects.
    ['target opponent gives you a card'],
    // Unrelated.
    ['draw a card'],
    ['destroy target creature'],
    // Reminder text mentioning gift — already stripped pre-normalize but
    // double-check the regex doesn't false-positive on the reminder phrasing
    // even if it slipped through.
    ['(you may promise an opponent a gift as you cast this spell.)'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
