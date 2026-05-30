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
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
