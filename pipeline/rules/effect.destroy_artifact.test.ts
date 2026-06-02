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
    // 2026-06-01 audit Group 20 — Crash and Burn: "destroy target Vehicle".
    // Vehicles are always artifacts (CR 205.3g), so destroying one is
    // semantically destroying an artifact. Same precedent as
    // effect.exile_artifact's PATTERN_VEHICLE arm.
    ['destroy target vehicle'],
    ['destroy each vehicle'],
    // 2026-06-01 audit batch — Light of Judgment: "destroy up to one
    // Equipment attached to that creature". Equipment is an artifact
    // subtype. Same precedent for Treasure / Food / Clue / Map / Powerstone /
    // Blood / Junk — destroying any of these IS destroying an artifact.
    ['destroy up to one equipment attached to that creature'],
    ['destroy target equipment'],
    ['destroy target treasure'],
    ['destroy target food'],
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
