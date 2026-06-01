import { describe, it, expect } from 'vitest';
import { rule } from './effect.mill';

describe('effect.mill', () => {
  it.each([
    ['mill 3 cards'],
    ['mill four cards'],
    ['mill seven cards'],
    ['target player mills four cards'],
    ['each opponent mills three cards'],
    ['put the top four cards of your library into your graveyard'],
    ['put the top three cards of their library into their graveyard'],
    ['mill 10 cards'],
    // Regression (Rowan's Grim Search): dig-and-discard pattern where the
    // unselected portion of a top-N look goes to graveyard.
    ['look at the top four cards of your library, then put up to two of them back on top of your library in any order and the rest into your graveyard'],
    ['look at the top three cards of your library. put one of them into your hand and the rest into your graveyard'],
    // Regression (Inverted Iceberg): "mill a card" — singular "a/an"
    // alternative to numeric quantifiers.
    ['when this artifact enters, mill a card, then draw a card.'],
    ['target opponent mills a card.'],
    // v0.14.1 — variable-N mill via "equal to". The Ancient One: "target
    // player mills cards equal to its mana value".
    ['when you discard a card this way, target player mills cards equal to its mana value'],
    ['that player mills cards equal to the number of permanents you control'],
    // Faerie Snoop — dig-2-keep-1, mill the other.
    ['look at the top two cards of your library. put one into your hand and the other into your graveyard'],
    // Variant — "into its owner's graveyard"
    ['put one into your hand and the other into its owner\'s graveyard'],
    // v0.20.0 — Cynical Loner: tutor-to-graveyard. "Search your library for
    // a card, put it into your graveyard, then shuffle". Functionally a
    // self-mill — a card ends up in graveyard.
    ['survival — at the beginning of your second main phase, if this creature is tapped, you may search your library for a card, put it into your graveyard, then shuffle.'],
    ['search your library for a creature card, put it into your graveyard, then shuffle'],
    // v0.21.0 — Nashi, Searcher in the Dark: "you mill that many cards" —
    // anaphoric count bound to a prior numeric clause (combat-damage amount).
    // Same axis as "mills cards equal to X", just an alternate phrasing.
    ['menace whenever __self__ deals combat damage to a player, you mill that many cards'],
    ['target player mills that many cards'],
    ['each player mills that many cards'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['exile cards from your graveyard'],
    ['exile the top card of your library'],
    ['draw cards from your library'],
    ['scry 2'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
