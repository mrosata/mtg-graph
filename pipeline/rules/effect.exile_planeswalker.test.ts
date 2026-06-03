import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_planeswalker';

describe('effect.exile_planeswalker', () => {
  it.each([
    ['exile target planeswalker'],
    ['exile target creature or planeswalker'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
    // Regression (Torch the Tower): damage targets "creature or planeswalker"
    // and the "would die ... exile it instead" replacement applies to any
    // permanent damaged. exile_creature already fires via PATTERN_REPLACEMENT;
    // the planeswalker sister-tag should mirror this.
    ['__self__ deals 2 damage to target creature or planeswalker. if a permanent dealt damage by __self__ would die this turn, exile it instead'],
    // v0.35.0 — Batch 16: End of the Hunt. Forced-edict with "creature or
    // planeswalker" disjunction — the planeswalker branch should fire the
    // exile-planeswalker axis.
    ['target opponent exiles a creature or planeswalker they control with the greatest mana value among creatures and planeswalkers they control.'],
    ['target opponent exiles a planeswalker they control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonplaneswalker permanent'],
    ['exile target creature'],
    ['exile target planeswalker card from a graveyard'],
    ['destroy target planeswalker'],
    // Replacement-arm context check: damage targets "creature" only (not
    // planeswalker), so the "would die ... exile instead" replacement
    // shouldn't pull a planeswalker tag. The replacement arm requires
    // "permanent" or "creature or planeswalker" earlier in the text.
    ['__self__ deals 2 damage to target creature. if that creature would die this turn, exile it instead'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
