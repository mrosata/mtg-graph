// pipeline/rules/effect.targeted_discard.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.targeted_discard';

describe('effect.targeted_discard', () => {
  it.each([
    // Thoughtseize family — reveal + choose + discard that card
    ['target opponent reveals their hand. you choose a nonland card from it. that player discards that card'],
    ['target opponent reveals their hand. you choose a nonland card from it. that player discards that card. if you don\'t control a faerie, exile a card from your hand'],
    // Mind Rot family — direct discard N cards
    ['target player discards two cards'],
    ['target opponent discards a card'],
    ['target opponent discards three cards'],
    // Each-opponent variant
    ['each opponent discards a card'],
    // Regression (Rankle's Prank): "each player discards" — broader symmetric
    // form that still forces opponents to discard.
    ['each player discards two cards'],
    // v0.14.1 — exile-from-hand as hand-disruption (Skullcap Snail). Same
    // functional axis as discard for graph-edge purposes.
    ['when this creature enters, target opponent exiles a card from their hand'],
    ['target opponent exiles two cards from their hand'],
    // v0.14.6 — punisher template (Zoyowa Lava-Tongue). "Each opponent may
    // discard a card or sacrifice a permanent" — punisher edicts force the
    // opponent into one of two options; discard is one of them.
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // Regression (Binding Negotiation): modern oracle templating uses the
    // bound pronoun "they discard it" after an earlier "target opponent
    // reveals their hand" anchor. Functionally identical to Thoughtseize's
    // "that player discards that card" but with pronouns substituted.
    ['target opponent reveals their hand. you may choose a nonland card from it. if you do, they discard it. otherwise, you may put a face-up exiled card they own into their graveyard.'],
    ['target opponent reveals their hand. choose a card from it. they discard that card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self-discard (loot) — different axis
    ['discard a card, then draw a card'],
    ['you may discard a card. if you do, draw a card'],
    // Discard as cost on own ability — not targeted hand attack
    ['discard a card: this creature gets +1/+1 until end of turn'],
    // Unrelated
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
