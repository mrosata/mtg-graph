import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutor_any';

describe('effect.tutor_any', () => {
  it.each([
    ['search your library for a card and put it into your hand'],
    ['search your library for any card'],
    ['search your library for a card, reveal it, put it into your hand, then shuffle'],
    ['search your library for any card, put it into your hand, then shuffle'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['search your library for a shrine card'],            // subtype tutor
    ['search your library for an artifact card'],         // type-restricted
    ['search your library for a creature card'],          // type-restricted
    ['search your library for an instant card'],          // type-restricted
    ['search your library for a basic land card'],        // type-restricted
    ['search your library for a basic plains card'],      // type-restricted
    ['draw a card'],                                      // unrelated
    ['look at the top card of your library'],             // separate effect
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
