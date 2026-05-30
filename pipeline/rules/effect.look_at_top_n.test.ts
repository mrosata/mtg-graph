import { describe, it, expect } from 'vitest';
import { rule } from './effect.look_at_top_n';

describe('effect.look_at_top_n', () => {
  it.each([
    ['look at the top card of your library'],
    ['look at the top three cards of your library'],
    ['look at the top four cards of target opponent\'s library'],
    ['reveal the top card of your library'],
    ['reveal the top five cards of your library'],
    ['look at the top 2 cards of your library'],
    // v0.14.1 — variable-N "that many" reveal frame. Ojer Kaslem: "reveal
    // that many cards from the top of your library".
    ['reveal that many cards from the top of your library'],
    ['reveal that many cards from the top of target opponent\'s library'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['draw three cards'],                       // drawing, not looking
    ['exile the top card of your library'],     // exiling, not looking
    ['mill four cards'],                        // milling, not looking
    ['scry 2'],                                 // separate keyword
    ['surveil 1'],                              // separate keyword
    ['put the top card of your library into your graveyard'], // milling form
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
