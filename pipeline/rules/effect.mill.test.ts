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
