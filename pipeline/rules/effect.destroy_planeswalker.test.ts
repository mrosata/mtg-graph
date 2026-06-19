import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_planeswalker';

describe('effect.destroy_planeswalker', () => {
  it.each([
    ['destroy target planeswalker'],
    ['destroy all planeswalkers'],
    ['destroy target creature or planeswalker'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonplaneswalker permanent'],
    ['destroy target creature'],
    ['exile target planeswalker'],
    ['planeswalker abilities you activate cost 1 less'],
    // v0.47.0 — self-destruction exclusion.
    ['destroy target planeswalker you own.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression (Urgent Necropsy): Vindicate-style multi-target chain.
  // PATTERN_OWN's {0,6} filler can't span past two prior "up to one target X,"
  // segments. The chained pattern anchors on `destroy` + a later
  // `target planeswalker` in the same sentence.
  it.each([
    ['destroy up to one target artifact, up to one target creature, up to one target enchantment, and up to one target planeswalker.'],
    ['destroy target creature and target planeswalker.'],
  ])('matches chained multi-target destroy: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // v0.47.0 — Sorin, Lord of Innistrad: "destroy up to three target creatures
  // and/or other planeswalkers." The `/` in "and/or" breaks PATTERN_OWN's
  // `[\w\-]+` filler. Extend to `[\w\-/]+` to admit slashes.
  it.each([
    ['destroy up to three target creatures and/or other planeswalkers.'],
  ])('matches /‐separated multi-type destroy: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
