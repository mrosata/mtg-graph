import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_land';

describe('effect.destroy_land', () => {
  it.each([
    ['destroy target land'],
    ['destroy all lands'],
    ['destroy target nonbasic land'],
    ['destroy target permanent'],
    ['destroy each nontoken permanent'],
    ['destroy target noncreature permanent'],
    // v0.14.27 — Krenko's Buzzcrusher: "destroy up to one nonbasic land that
    // player controls" — bare "up to N <qualifier> land" without an explicit
    // target/each/all/another determiner.
    ['destroy up to one nonbasic land that player controls'],
    ['destroy up to two nonbasic lands'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonland permanent'],
    ['destroy target creature'],
    ['destroy target artifact'],
    ['sacrifice a land'],
    ['target land becomes a 4/4 elemental creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
