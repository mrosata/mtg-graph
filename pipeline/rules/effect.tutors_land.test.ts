// pipeline/rules/effect.tutors_land.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_land';

describe('effect.tutors_land', () => {
  it.each([
    // Expedition Map — canonical.
    ['{2}, {t}, sacrifice this artifact: search your library for a land card, reveal it, put it into your hand, then shuffle.'],
    // Gladiolus Amicitia — search-and-put-into-play form (unrestricted "land card").
    ['when gladiolus amicitia enters, search your library for a land card, put it onto the battlefield tapped, then shuffle.'],
    // Wight of the Reliquary-style activated tutor.
    ['{t}, sacrifice another creature: search your library for a land card, put it onto the battlefield tapped, then shuffle.'],
    // World Map (second mode).
    ['{3}, {t}, sacrifice this artifact: search your library for a land card, reveal it, put it into your hand, then shuffle.'],
  ])('matches unrestricted land-tutor phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Basic-land tutor — must NOT fire (different axis, anchored on "basic land card").
    ['search your library for a basic land card, reveal it, put it into your hand'],
    ['search your library for up to two basic land cards'],
    // Typed-basic land tutor — must NOT fire (basic-land axis).
    ['search your library for a basic plains card'],
    // "Land card with a basic land type" — Nervous Gardener form, covered by basic-land tutor.
    ['search your library for a land card with a basic land type, reveal it, put it into your hand, then shuffle'],
    // Creature tutor — different axis.
    ['search your library for a creature card'],
    // Play an extra land — not a tutor.
    ['you may play an additional land this turn'],
    // Destroy a land — different axis.
    ['destroy target land'],
    // Generic tutor — should not fire (no land restriction).
    ['search your library for a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
