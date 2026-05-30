import { describe, it, expect } from 'vitest';
import { rule } from './effect.draws_or_discards';

describe('effect.draws_or_discards', () => {
  it.each([
    ['draw a card'],
    ['discard 2 cards'],
    ['you draw a card'],
    ['you discard a card'],
    ['draw 2 cards'],
    // Scryfall oracle text spells out small counts.
    ['draw three cards'],
    ['draw two cards'],
    ['draw seven cards'],
    ['discard three cards'],
    // Sequential / conjunction frames — must match (regression for audit findings).
    ['scry 1, then draw a card'],
    ['you gain 3 life and draw a card'],
    ['discard a card, then draw a card'],
    ['you may draw a card'],
    // Colon-introduced effect on activated abilities.
    ['{t}: draw a card'],
    ['{2}, {t}, sacrifice this artifact: you gain 3 life and draw a card'],
    // Bullet point (modal cards).
    ['• discard a card, then draw a card'],
    ['• draw two cards'],
    // Regression (Rankle's Prank): modal frame with non-"you" subject.
    ['• each player discards two cards'],
    // Regression (Rankle's Prank, first bullet — text after em-dash header).
    ['choose one or more — • each player discards two cards. • each player loses 4 life.'],
    // Regression (Lord Skitter's Blessing): "draw an additional card" frame.
    ['you lose 1 life and you draw an additional card'],
    // Regression (Malevolent Witchkite): variable-count "that many cards".
    ['sacrifice any number of artifacts, enchantments, and/or tokens, then draw that many cards'],
    // Regression (Audience with Trostani): "draw cards equal to" frame.
    ['create a 0/1 green plant creature token, then draw cards equal to the number of differently named creature tokens you control.'],
    // Regression (Alquist Proft, Master Sleuth): variable-X draw frame.
    ['you draw x cards and gain x life.'],
    ['sacrifice a clue: you draw x cards and gain x life.'],
    // Variable N form (e.g. "draw n cards" generically).
    ['draw n cards'],
    // Connecting the Dots — "discard your hand" as activation cost.
    ['{1}{r}, discard your hand, sacrifice this enchantment: put all cards exiled with this enchantment into their owners hands'],
    // Hellbent-enabler variant.
    ['discard your hand. then draw a card for each card discarded this way'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['whenever you draw a card'],
    ['if you would draw a card'],
    ['each time you draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
