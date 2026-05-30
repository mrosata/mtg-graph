import { describe, it, expect } from 'vitest';
import { rule } from './effect.cheat_into_play';

describe('effect.cheat_into_play', () => {
  it.each([
    // Pattern A — search library + put onto battlefield (non-land)
    ['search your library for a creature card with mana value x or less, put it onto the battlefield, then shuffle.'],
    ['search your library for an artifact card, put it onto the battlefield, then shuffle.'],
    // Pattern B — look at top + put onto battlefield (across sentence boundaries)
    ['look at the top six cards of your library. you may reveal a creature card from among them. if that card has mana value 2 or less, you may put it onto the battlefield.'],
    ['look at the top six cards of your library. you may reveal a creature card with mana value less than or equal to the number of lands you control from among them and put it onto the battlefield.'],
    // Pattern C — exiled cards → battlefield
    ['put any number of exiled cards with that name onto the battlefield.'],
    ['you may put an exiled creature card used to craft __self__ onto the battlefield.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pattern A negatives — land tutors must NOT fire
    ['search your library for a basic forest card, put that card onto the battlefield, then shuffle.'],
    ['search your library for a plains card and put it onto the battlefield tapped.'],
    ['search your library for a cave card, put it onto the battlefield tapped, then shuffle.'],
    // Plural land tutors must NOT fire
    ['search your library for up to two basic land cards, put them onto the battlefield.'],
    ['search your library for three basic land cards and put them onto the battlefield.'],
    ['search your library for up to that many basic land cards, put them onto the battlefield.'],
    // Reanimate
    ['return target creature card from your graveyard to the battlefield.'],
    // Cloak/manifest
    ['manifest dread.'],
    // Pattern B negative — look at top + face-down put-onto-battlefield (filter rejects this)
    ['look at the top three cards of your library. you may put that card face down onto the battlefield.'],
    // Generic land card search — non-basic land ramp, NOT cheat_into_play
    ['search your library for a land card, put it onto the battlefield tapped.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
