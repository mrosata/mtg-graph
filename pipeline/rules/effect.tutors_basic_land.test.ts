import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_basic_land';

describe('effect.tutors_basic_land', () => {
  it.each([
    // Brave the Wilds / Lay of the Land
    ['search your library for a basic land card, reveal it, put it into your hand'],
    // Cultivate / Kodama's Reach
    ['search your library for up to two basic land cards'],
    // Variant
    ['search your library for a basic land card and put it onto the battlefield tapped'],
    ['search your library for up to three basic land cards'],
    // Regression (The Huntsman's Redemption): hybrid "A or B card" sharing
    // the trailing noun.
    ['search your library for a creature or basic land card, reveal it, put it into your hand'],
    // Regression (Clay-Fired Bricks): typed basic land — "basic Plains card".
    ['when this artifact enters, search your library for a basic plains card, reveal it, put it into your hand, then shuffle.'],
    ['search your library for a basic forest card'],
    ['search your library for up to two basic island cards'],
    // v0.14.7 — Regression (Flourishing Bloom-Kin): typed-land search WITHOUT
    // the literal "basic" qualifier. Plains/Island/Swamp/Mountain/Forest are
    // basic-land subtypes by Magic rules, so "Forest cards" alone is still a
    // basic-land tutor for graph-edge purposes.
    ['search your library for up to two forest cards and reveal them'],
    ['search your library for a plains card'],
    ['search your library for three swamp cards'],
    // v0.14.15 — modern templating "land card with a basic land type" (matches
    // basic lands AND shock/check/etc. duals that have a basic land type).
    // Functionally a basic-land tutor for graph-edge purposes. Nervous Gardener.
    ['search your library for a land card with a basic land type, reveal it, put it into your hand, then shuffle'],
    ["search target player's library for a land card with a basic land type"],
    // v0.14.27 — Krenko's Buzzcrusher: "search their library for a basic land
    // card" — symmetry doesn't matter for the tag axis; the tutor still
    // happens (Krenko grants the search to each affected player).
    ['search their library for a basic land card, put it onto the battlefield tapped, then shuffle'],
    ["search that player's library for a basic land card"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Generic tutor — not basic-land-restricted
    ['search your library for a card'],
    ['search your library for a creature card'],
    // Non-basic land tutor
    ['search your library for a forest or a plains card'],
    // Mentions "land" but isn't a tutor
    ['destroy target land'],
    ['add one mana of any color'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
