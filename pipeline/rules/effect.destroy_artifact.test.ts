import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_artifact';

describe('effect.destroy_artifact', () => {
  it.each([
    // Own-type
    ['destroy target artifact'],
    ['destroy all artifacts'],
    ['destroy target artifact or enchantment'],
    ['destroy each artifact with mana value 3 or less'],
    // Type-inclusive broad
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
    ['destroy each nontoken permanent'],
    // v0.14.1 — "destroy target noncreature, nonland permanent" — Molten
    // Collapse's two-comma chain in the type filter. The "nonartifact" guard
    // does NOT apply (no "nonartifact" present), so artifact should fire.
    ['destroy target noncreature, nonland permanent with mana value 1 or less'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // nonartifact explicitly excludes artifact
    ['destroy target nonartifact permanent'],
    // Wrong type / verb
    ['destroy target creature'],
    ['destroy target enchantment'],
    ['exile target artifact'],
    ['sacrifice an artifact'],
    // No verb
    ['artifact creatures you control have flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
