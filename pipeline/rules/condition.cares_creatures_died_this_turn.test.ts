import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_creatures_died_this_turn';

describe('condition.cares_creatures_died_this_turn', () => {
  it.each([
    // Callous Sell-Sword — ETB-with-counters morbid scaling
    ['this creature enters with a +1/+1 counter on it for each creature that died under your control this turn'],
    // Generic morbid count
    ['for each creature that died this turn'],
    ['equal to the number of creatures that died this turn'],
    ['creatures you control that died this turn'],
    // Aftermath-style
    ['creatures that died this turn'],
    // v0.14.15 — "creature card was put into your graveyard from anywhere
    // this turn" (Macabre Reconstruction). Broader than "died" (anywhere
    // includes mill / discard), but the same morbid / aristocrats payoff
    // family for graph purposes.
    ['this spell costs {2} less to cast if a creature card was put into your graveyard from anywhere this turn'],
    ['if a creature card was put into your graveyard this turn'],
    ['if one or more creature cards were put into your graveyard from anywhere this turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Trigger axis — fires at the moment of death, not a "this turn count"
    ['whenever a creature dies'],
    ['whenever a creature you control dies, draw a card'],
    // Static graveyard reference — doesn't scope to "this turn"
    ['creatures in your graveyard'],
    ['creature cards in your graveyard'],
    ['return target creature card from your graveyard to your hand'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
