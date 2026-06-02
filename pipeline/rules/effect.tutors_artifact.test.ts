// pipeline/rules/effect.tutors_artifact.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_artifact';

describe('effect.tutors_artifact', () => {
  it.each([
    ['search your library for an artifact card'],
    ['search your library for an artifact card, reveal it, then shuffle'],
    ['search your library for an artifact card with mana value 4 or less'],
    ['search your library for a legendary artifact card'],
    ["search target opponent's library for an artifact card"],
    // Hybrid: "artifact or X card"
    ['search your library for an artifact or enchantment card and put it into your hand'],
    // Hybrid: "X or artifact card"
    ['search your library for a creature or artifact card and reveal it'],
    // 2026-06-01 audit Group 16 — Brightglass Gearhulk: three-way tutor list
    // joined by "and/or" with plural `cards`. Filler must admit `/` and the
    // trailing noun must allow `cards?`.
    ['search your library for up to two artifact, creature, and/or enchantment cards with mana value 1 or less'],
  ])('matches artifact-tutor phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['search your library for a card and put it into your hand'],
    ['search your library for a creature card'],
    ['search your library for a basic land card'],
    ['draw an artifact card from your library'], // not a tutor (no "search")
    ['return target artifact card from your graveyard to the battlefield'], // reanimation
    ['look at the top five cards of your library'], // selection
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
