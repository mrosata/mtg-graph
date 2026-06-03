// pipeline/rules/condition.cares_hand_size.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_hand_size';

describe('condition.cares_hand_size', () => {
  it.each([
    // Hellbent gate — "you have no cards in hand" (Case of the Crimson
    // Pulse's solve condition, classic Hellbent).
    ['you have no cards in hand'],
    ['if you have no cards in hand'],
    ['surveil 3 if you have no cards in hand'],
    // At-most-1 gate (Bandit's Talent's level-2 trigger).
    ['if that player has one or fewer cards in hand, they lose 2 life'],
    ['for each opponent who has one or fewer cards in hand'],
    // "For each card in <hand>" scaling — Stingerback Terror's anti-anthem,
    // Roaring Furnace // Steaming Sauna's damage scaling.
    ['this creature gets -1/-1 for each card in your hand'],
    ['deals damage equal to the number of cards in your hand'],
    // Variable-X scaling on hand count.
    ["where x is the number of cards in your hand"],
    // Threshold count.
    ['if there are three or more cards in your hand'],
    // v0.35.0 — Batch 15: opponent-hand qualifier. Borrowed Knowledge
    // scales draws on "cards in target opponent's hand".
    ["draw cards equal to the number of cards in target opponent's hand."],
    // v0.35.0 — Batch 15: relative comparison "an opponent has more cards
    // in hand than you" (Joined Researchers).
    ['at the beginning of each end step, if an opponent has more cards in hand than you, this creature becomes prepared.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Plain draw/discard verbs — different axis (draws_or_discards).
    ['draw a card'],
    ['discard a card'],
    ['discard your hand'],
    // Generic "from your hand" cost (exile/discard from hand) — different
    // axis. The card doesn't scale on hand size; it moves a card.
    ['exile a card from your hand'],
    // Drawing scaling on a DIFFERENT count.
    ['draw cards equal to the number of creatures you control'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
