import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_from_library';

describe('effect.exile_from_library', () => {
  it.each([
    // Ashiok — three frames on one card.
    ['exile that many cards from the top of your library instead'],
    ['target player exiles the top x cards of their library, where x is the total mana value of cards you own in exile'],
    // Common Standard variants.
    ['exile the top card of your library'],
    ['exile the top two cards of your library'],
    ['exile the top three cards of target opponent\'s library'],
    ['exile the top x cards of your library'],
    ['each opponent exiles the top five cards of their library'],
    // "exile the top card of their library" — opponent-scoped variants.
    ['target opponent exiles the top three cards of their library'],
    // v0.15 — tutor-then-exile frame (Omenpath Journey):
    // "search your library for X cards, exile them". The library is searched,
    // matching cards are exiled (typically to enable a later play-from-exile
    // payoff). Distinct from a pure tutor — the exile destination is what
    // qualifies it for this tag.
    ['search your library for up to five land cards that have different names, exile them, then shuffle'],
    ['search your library for a card and exile it'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Not library — different zone.
    ['exile target card from a graveyard'],
    ['exile target creature'],
    ['exile target permanent'],
    // Mill (graveyard, not exile).
    ['mill three cards'],
    ['put the top three cards of your library into your graveyard'],
    // Cost-form exile from one's OWN library is rare; we don't try to exclude it.
    // Look-at (no zone change).
    ['look at the top two cards of your library'],
    // Search (tutor, not exile).
    ['search your library for a card, then shuffle'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
