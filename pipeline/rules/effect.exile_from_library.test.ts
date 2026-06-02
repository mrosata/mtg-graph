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
    // v0.18 — Frame E: "look at top N cards. you may exile a card from among
    // them" (Make Your Own Luck, The Key to the Vault). The exile is opt-in
    // and the source is "from among them" rather than naming the library
    // again. Distinct from a pure look (no exile destination).
    ['look at the top three cards of your library. you may exile a nonland card from among them'],
    ['look at that many cards from the top of your library. you may exile a nonland card from among them'],
    // v0.18 — Frame F: variable expression count "exile cards equal to X
    // from the top of <library>" (Rakdos, the Muscle).
    ["exile cards equal to its mana value from the top of target player's library"],
    ['exile cards equal to the number of artifacts you control from the top of your library'],
    // v0.20 — Frame C with optional NUM (The Infamous Cruelclaw):
    // "exile cards from the top of your library until you exile a nonland card".
    ['exile cards from the top of your library until you exile a nonland card'],
    // v0.20 — Frame E broadened to admit `reveal` (Portent of Calamity):
    // "reveal the top X cards of your library ... you may exile a card ...
    // from among them".
    ['reveal the top x cards of your library. for each card type, you may exile a card of that type from among them.'],
    // v0.20.0 — Doomsday Excruciator: "exile all but the bottom N cards"
    // — the rest of the library is exiled.
    ['flying when this creature enters, if it was cast, each player exiles all but the bottom six cards of their library face down. at the beginning of your upkeep, draw a card.'],
    ['each player exiles all but the bottom six cards of their library face down'],
    ['you exile all but the top three cards of your library'],
    // 2026-06-01 audit Group 13 — Ancient Vendetta: tutor-then-exile on a
    // TARGET OPPONENT's library (Frame D currently restricts to "your
    // library"). Multi-zone search includes the library.
    ["search target opponent's graveyard, hand, and library for up to four cards with that name and exile them"],
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
