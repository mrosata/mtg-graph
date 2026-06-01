// pipeline/rules/condition.cares_planeswalkers.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_planeswalkers';

describe('condition.cares_planeswalkers', () => {
  it.each([
    // Anthem-style subject (plural + singular).
    ['planeswalkers you control have hexproof'],
    ['planeswalker you control gains loyalty'],
    // Combat / attack trigger gated on planeswalkers under your control.
    // Tomik, Wielder of Law: combo subject "you and/or planeswalkers you control".
    ['whenever an opponent attacks with creatures, if two or more of those creatures are attacking you and/or planeswalkers you control, that opponent loses 3 life'],
    // Eriette of the Charmed Apple's planeswalker-defender trigger.
    ['whenever a creature an opponent controls attacks you or a planeswalker you control'],
    // "For each planeswalker" scaling.
    ['this spell costs {1} less for each planeswalker you control'],
    // "Affinity for planeswalkers" keyword cost reduction.
    ['affinity for planeswalkers'],
    // Tutoring / payoff on planeswalker count.
    ['choose a planeswalker you control'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Self-reference on a planeswalker card — "this planeswalker" should
    // not trigger the rule (the card IS the planeswalker, doesn't
    // "care about" planeswalkers as a payoff group).
    ['this planeswalker has +1 loyalty'],
    // Single-target removal of opponents' planeswalkers — wrong axis
    // (handled by effect.destroy_planeswalker / effect.exile_planeswalker).
    ['destroy target planeswalker'],
    ['exile target planeswalker an opponent controls'],
    // Token creation — different axis.
    ['create a planeswalker token that is a copy of'],
    // Generic.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
