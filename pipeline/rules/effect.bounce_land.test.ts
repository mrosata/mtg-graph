import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_land';

describe('effect.bounce_land', () => {
  it.each([
    ['return target land to its owner\'s hand'],
    ['return target nonbasic land to its owner\'s hand'],
    ['return target permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonland permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['destroy target land'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // 2026-06-02 audit Wave 2 — exile + return-to-battlefield is FLICKER
    // (delayed) or BLINK (immediate), not bounce. Mirrors the narrowing
    // already applied to effect.bounce_creature / effect.bounce_artifact.
    ['exile target land, then return that land to the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression (Arid Archway and the OTJ "Archway" cycle): self-bounce land
  // template uses the bare "a" determiner ("return a land you control to its
  // owner's hand") rather than "target" / "another". PATTERN_RETURN_OWN and
  // PATTERN_BROAD both gated on `another|target|each|all`, missing the entire
  // cycle. ("a" only — "an land" is ungrammatical; typed-land subjects like
  // "an Island" would require teaching the rule about land subtypes, which is
  // a separate broadening.)
  it.each([
    ['this land enters tapped. when this land enters, return a land you control to its owner\'s hand. if another desert was returned this way, surveil 1.'],
    ['return a land you control to its owner\'s hand'],
  ])('matches "a" determiner self-bounce land: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
