import { describe, it, expect } from 'vitest';
import { rule } from './effect.return_from_graveyard_to_hand';

describe('effect.return_from_graveyard_to_hand', () => {
  it.each([
    // Overlord of the Balemurk
    ['mill four cards, then you may return a non-avatar creature card or a planeswalker card from your graveyard to your hand'],
    // Awaken the Honored Dead III
    ['you may discard a card. when you do, return target creature or land card from your graveyard to your hand'],
    // simple recursion
    ['return target creature card from your graveyard to your hand'],
    ['return target card from your graveyard to your hand'],
    // multi-target / pluralized
    ['return two target creature cards from your graveyard to your hand'],
    // opponent's graveyard
    ["return target creature card from an opponent's graveyard to your hand"],
    // Regression: Edgewall Inn — "card that has an Adventure" modifier
    // between the noun and the "from your graveyard" clause.
    ['return target card that has an adventure from your graveyard to your hand'],
    // v0.21.0 — Greenhouse // Rickety Gazebo: mill-then-return-from-among-
    // them frame. The mill puts cards into the graveyard then immediately
    // returns some to hand — semantically a graveyard-to-hand recursion.
    ['mill four cards, then return up to two permanent cards from among them to your hand'],
    // v0.30 — Group 30 — Dredger's Insight: "from among the milled cards"
    // anaphor for the milled subset. 11 cards in Standard use this frame.
    ['whenever one or more artifact and/or creature cards leave your graveyard, you gain 1 life. when this enchantment enters, mill four cards. you may put an artifact, creature, or land card from among the milled cards into your hand.'],
    ['put a card from among the milled cards into your hand'],
    ['put up to two cards from among the cards milled this way into your hand'],
    // v0.34 — 400-card audit batch (HIGH-20) — Midnight Tilling: same mill-
    // then-return-from-among-them frame as Greenhouse / Rickety Gazebo,
    // but with optional "you may" + `a` (singular indefinite) count.
    ['mill four cards, then you may return a permanent card from among them to your hand.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // reanimation (to battlefield) must not fire this rule
    ['return target creature card from your graveyard to the battlefield'],
    // bounce from battlefield to hand
    ["return target creature to its owner's hand"],
    // discard, no graveyard
    ['discard a card, then draw a card'],
    // return from exile, not graveyard
    ['return target card from exile to your hand'],
    // v0.30 — Group 30 — "from among the milled cards onto the battlefield"
    // is reanimation, not return-to-hand. Distinguish from the new arm.
    ['mill four cards. put a creature card from among the milled cards onto the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
