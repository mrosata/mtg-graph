// pipeline/rules/effect.tutors_instant_sorcery.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_instant_sorcery';

describe('effect.tutors_instant_sorcery', () => {
  it.each([
    // Micromancer — exact normalized text.
    ['when this creature enters, you may search your library for an instant or sorcery card with mana value 1, reveal it, put it into your hand, then shuffle.'],
    // Mystical Tutor — direct.
    ['search your library for an instant or sorcery card, reveal it, then shuffle and put that card on top.'],
    // Mystical Teachings — split "instant card or a card with flash" form.
    ['search your library for an instant card or a card with flash, reveal it, put it into your hand, then shuffle.'],
    // Sanar / Wild Idea — plain typed tutor.
    ['search your library for an instant or sorcery card, reveal it, put it into your hand, then shuffle.'],
  ])('matches instant/sorcery tutor phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Creature tutor — different axis.
    ['search your library for a creature card'],
    // Basic-land tutor — different axis.
    ['search your library for a basic land card'],
    // Generic tutor — different axis.
    ['search your library for a card and put it into your hand'],
    // Artifact tutor — different axis.
    ['search your library for an artifact card'],
    // Just casting an instant — not a tutor.
    ['you may cast this spell as though it had flash'],
    // Recursion from graveyard, not library.
    ['return target instant or sorcery card from your graveyard to your hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
