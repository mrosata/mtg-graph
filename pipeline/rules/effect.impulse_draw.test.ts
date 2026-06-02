import { describe, it, expect } from 'vitest';
import { rule } from './effect.impulse_draw';

describe('effect.impulse_draw', () => {
  it.each([
    // Breeches, Eager Pillager — "you may play it this turn"
    ['exile the top card of your library. you may play it this turn.'],
    // Inti, Seneschal of the Sun — "play that card until your next end step"
    ['exile the top card of your library. you may play that card until your next end step.'],
    // "Play it until end of turn" variant
    ['exile the top card of your library. you may play it until end of turn.'],
    // Without "may" — forced play
    ['exile the top card of your library. play it this turn.'],
    // Case of the Burning Masks — multi-card-then-pick impulse draw
    ['exile the top three cards of your library. choose one of them. you may play that card this turn.'],
    // Generic multi-card pick variant ("choose one of those cards")
    ['exile the top two cards of your library. choose one of those cards. you may play it this turn.'],
    // Expedited Inheritance — 3rd-person controller framing + "from the top of" inversion.
    ['its controller may exile that many cards from the top of their library. they may play those cards until the end of their next turn'],
    // Regression (Bruse Tarl, Roving Rancher): modern templating uses the
    // verb `cast` instead of `play` for non-land impulse-draw effects. The
    // "non-land card → you may cast it" branch of conditional impulse-draw
    // is a recurring shape (Bruse Tarl, Twinflame Pathway-style cards).
    ['exile the top card of your library. if it\'s a land card, create a 2/2 white ox creature token. otherwise, you may cast it until the end of your next turn.'],
    ['exile the top card of your library. you may cast it this turn.'],
    ['exile the top card of your library. you may cast that card until end of turn.'],
    // v0.15 — comma-and-long-intermediate frame (Loot, the Key to Everything).
    // After "library" can come a comma (not a period) followed by a longer
    // intermediate clause (~80 chars defining X), then the play-from-exile
    // permission in the next sentence.
    ['exile the top x cards of your library, where x is the number of card types among other nonland permanents you control. you may play those cards this turn.'],
    // HIGH-5c (End-Blaze Epiphany): "exile a number of cards from the top of your library equal to its power, then choose a card exiled this way. Until the end of your next turn, you may play that card."
    ['__self__ deals x damage to target creature. when that creature dies this turn, exile a number of cards from the top of your library equal to its power, then choose a card exiled this way. until the end of your next turn, you may play that card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pure mill — no play-from-exile clause
    ['exile the top card of your library.'],
    // Multi-card exile with no play clause — must NOT fire
    ['exile the top three cards of your library.'],
    // Tutor / library search — different mechanic
    ['search your library for a card.'],
    // Plain card draw
    ['draw a card.'],
    // Reanimate — different source zone
    ['return target creature card from your graveyard to the battlefield.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
