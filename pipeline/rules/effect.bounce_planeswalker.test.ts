import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_planeswalker';

describe('effect.bounce_planeswalker', () => {
  it.each([
    ['return target planeswalker to its owner\'s hand'],
    ['return target creature or planeswalker to its owner\'s hand'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    // 2026-06-01 audit batch — broad-permanent bounce with count slot.
    ["return up to two other target nonland permanents to their owners' hands"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonplaneswalker permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['destroy target planeswalker'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // 2026-06-02 audit Wave 2 — exile + return-to-battlefield is FLICKER
    // (delayed) or BLINK (immediate), not bounce. Mirrors the narrowing
    // already applied to effect.bounce_creature / effect.bounce_artifact.
    ['exile target planeswalker, then return that planeswalker to the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
