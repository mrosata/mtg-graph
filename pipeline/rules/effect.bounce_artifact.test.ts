import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_artifact';

describe('effect.bounce_artifact', () => {
  it.each([
    ['return target artifact to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    // Cryptic Coat — Equipment self-bounce activated ability.
    ["{1}{u}: return this equipment to its owner's hand"],
    // Vehicle self-bounce analog.
    ["return this vehicle to its owner's hand"],
    // "this artifact" generic form.
    ["return this artifact to its owner's hand"],
    // 2026-06-01 audit batch — broad-permanent bounce with count slot.
    ["return up to two other target nonland permanents to their owners' hands"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonartifact permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target artifact card from your graveyard'],
    ['destroy target artifact'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // 2026-06-01 audit batch — Ishgard, the Holy See: graveyard recursion of
    // artifact and/or enchantment cards is NOT bounce_artifact.
    ['return up to two target artifact and/or enchantment cards from your graveyard to your hand'],
    // 2026-06-02 audit Wave 2 — exile + return-to-battlefield is FLICKER
    // (delayed) or BLINK (immediate), not bounce. Mirrors the narrowing
    // already applied to effect.bounce_creature. PATTERN_BLINK_OWN
    // removed from this rule.
    ['exile target artifact, then return that artifact to the battlefield'],
    // 2026-06-02 audit batch — Hide on the Ceiling: exile + delayed return
    // of artifacts/creatures is flicker, NOT bounce_artifact.
    ["exile x target artifacts and/or creatures. return the exiled cards to the battlefield under their owners' control at the beginning of the next end step."],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
