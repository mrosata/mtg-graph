// pipeline/rules/trigger.creature_leaves_graveyard.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.creature_leaves_graveyard';

describe('trigger.creature_leaves_graveyard', () => {
  it.each([
    ['whenever a card leaves a graveyard'],
    ['whenever one or more cards are exiled from a graveyard'],
    // v0.12.9 — "when a creature card is exiled this way" follow-up trigger
    // anchored to a preceding "exile target card from a graveyard" clause
    // (Agatha's Soul Cauldron).
    ['{t}: exile target card from a graveyard. when a creature card is exiled this way, put a +1/+1 counter on target creature you control'],
    ['exile target creature card from a graveyard. when a card is exiled this way, draw a card'],
    // Chalk Outline — plural-form with typed noun qualifier ("creature cards").
    ['whenever one or more creature cards leave your graveyard, create a 2/2 white and blue detective creature token, then investigate'],
    // Same shape but singular noun + typed qualifier.
    ['whenever a creature card leaves your graveyard, draw a card'],
    // Permanent-card variant.
    ['whenever a permanent card is exiled from your graveyard, gain 1 life'],
    // v0.14.9 — Regression (Kaya, Spirits' Justice): "<X> cards in <player>'s
    // graveyard are put into exile" word order. The compound trigger's
    // graveyard-side branch fires when graveyard cards are exiled.
    ['whenever one or more creatures you control and/or creature cards in your graveyard are put into exile, you may choose a creature card from among them'],
    ['whenever a creature card in your graveyard is put into exile, draw a card'],
    // v0.30 — Group 8 — Dredger's Insight: compound type list with "and/or"
    // before "cards leave your graveyard". The slash in "and/or" breaks the
    // single-token word filler.
    ['whenever one or more artifact and/or creature cards leave your graveyard, you gain 1 life.'],
    // v0.30 — Group 8 — Ketramose: "put into exile from graveyards" (plural,
    // disjunctive zone source). Strong cares-graveyard-leaves trigger.
    ['whenever one or more cards are put into exile from graveyards and/or the battlefield during your turn, you draw a card and lose 1 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['return target card from a graveyard'],
    // "exiled this way" without a preceding "from a graveyard" clause is
    // a different exile pathway (e.g. exile from library/hand) — don't fire.
    ['exile the top card of your library. when a creature card is exiled this way, you may cast it'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
