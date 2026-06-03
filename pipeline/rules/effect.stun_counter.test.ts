import { describe, it, expect } from 'vitest';
import { rule } from './effect.stun_counter';

describe('effect.stun_counter', () => {
  it.each([
    // Dreamdew Entrancer — "put three stun counters on it" ETB.
    ['when this creature enters, tap up to one target creature and put three stun counters on it'],
    // Drag to the Bottom-style sweeper.
    ['put a stun counter on each creature an opponent controls'],
    // Single-target soft removal.
    ['tap target creature. put two stun counters on it'],
    // Targeting variants.
    ['put a stun counter on target permanent an opponent controls'],
    // Scaling — "for each stun counter on" payoff.
    ['this creature gets +1/+1 for each stun counter on it'],
    // Anaphoric "with a stun counter".
    ["target creature with a stun counter on it can't attack or block"],
    // v0.35.0 — Batch 13: ETB-with-stun-counters (Slumbering Trudge).
    // Static ETB form with "a number of stun counters" count slot.
    ['this creature enters with a number of stun counters on it equal to three minus x. if x is 2 or less, it enters tapped.'],
    // v0.35.0 — Batch 13: compound count "twice X" (Procrastinate).
    ['tap target creature. put twice x stun counters on it.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Stat counters — different axis.
    ['put a +1/+1 counter on target creature'],
    // Charge counters — different axis.
    ['put a charge counter on this artifact'],
    // Tap action only — no stun counters.
    ['tap target creature'],
    // Loyalty/keyword counters.
    ['put a loyalty counter on this planeswalker'],
    // Unrelated.
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
