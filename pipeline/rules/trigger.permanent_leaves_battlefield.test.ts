import { describe, it, expect } from 'vitest';
import { rule } from './trigger.permanent_leaves_battlefield';

describe('trigger.permanent_leaves_battlefield (parent, universal-only)', () => {
  it.each([
    ['whenever a permanent leaves the battlefield'],
    ['whenever a permanent you control leaves the battlefield'],
    ['when another permanent leaves the battlefield'],
    ['whenever a nontoken permanent leaves the battlefield'],
    // v0.38.0 — Batch 3: short-form "is put into a graveyard" (without "from
    // the battlefield"). Aetherworks Marvel: "whenever a permanent you
    // control is put into a graveyard". Universal-permanent scope only;
    // typed sibling rules stay strict.
    ['whenever a permanent you control is put into a graveyard'],
    // v0.50 (S22) — "nonland permanent" is functionally universal, mirroring
    // the v0.15 destroy_permanent precedent (row flipped from the explicit
    // negative block below).
    ['whenever a nonland permanent leaves the battlefield'],
    // v0.50 (S22) — returned-to-hand IS leaving the battlefield (Justice,
    // Vance Astrovik).
    ["whenever another nonland permanent you control is returned to its owner's hand, put a +1/+1 counter on __self__."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Type-specific must NOT match the parent
    ['whenever a creature leaves the battlefield'],
    ['whenever an artifact leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['when this creature leaves the battlefield'],
    // Type-excluding modifiers must NOT match (parent reserved for universal).
    // v0.50 (S22): the "nonland permanent" row moved to the positive block —
    // nonland permanent is functionally universal (v0.15 destroy_permanent
    // precedent). Other non<type> modifiers stay excluded.
    ['whenever a noncreature permanent leaves the battlefield'],
    // Dies is its own tag
    ['whenever a creature dies'],
    // Descriptive prose
    ['the creature leaves the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
