// pipeline/rules/effect.tutors_creature.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_creature';

describe('effect.tutors_creature', () => {
  it.each([
    ['search your library for a creature card'],
    ['search your library for a creature card, reveal it, then shuffle'],
    ['search your library for a legendary creature card'],
    ['search your library for a basic plains card or a creature card'],
    ['search target opponent\'s library for a creature card'],
    // Regression (The Huntsman's Redemption): hybrid "A or B card" sharing
    // the trailing noun across both type alternatives.
    ['search your library for a creature or basic land card, reveal it, put it into your hand'],
  ])('matches creature-tutor phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['search your library for a card and put it into your hand'],
    ['search your library for an artifact card'],
    ['search your library for a basic land card'],
    ['draw a creature card from your library'], // not a tutor (no "search")
    ['return target creature card from your graveyard to the battlefield'], // reanimation, not tutoring
    ['look at the top five cards of your library'], // selection, not tutor
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
