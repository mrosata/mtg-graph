import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_plus_one_counter';

describe('condition.cares_plus_one_counter', () => {
  it.each([
    ['if it has a +1/+1 counter on it'],
    ['if __self__ has a +1/+1 counter on it'],
    ['if that creature has a +1/+1 counter on it'],
    ['as long as __self__ has a +1/+1 counter on it'],
    ['whenever a creature you control with a +1/+1 counter on it attacks'],
    ['creatures you control with a +1/+1 counter on them get +1/+1'],
    ['a creature you control with a +1/+1 counter on it'],
    ['for each +1/+1 counter on __self__'],
    ['if a creature with a +1/+1 counter on it died this turn'],
    ['target creature with a +1/+1 counter on it'],
    // v0.12.9 — "X is the number of +1/+1 counters on Y" scaling form
    // (Anim Pakal, Thousandth Moon — token-count payoff scales off
    // accumulated counters).
    ['create x 1/1 colorless gnome artifact creature tokens that are tapped and attacking, where x is the number of +1/+1 counters on __self__'],
    ['draw cards equal to the number of +1/+1 counters on __self__'],
    ['x is the number of +1/+1 counters on that creature'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on target creature'],
    ['put two +1/+1 counters on each creature you control'],
    ['__self__ deals 2 damage to any target'],
    ['draw a card'],
    ['for each other creature you control'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });

  // The looser "with a counter" / "with counters on" phrasing — common in modern
  // standard cards like Innkeeper's Talent — only counts as cares-about-plus-one
  // when the card also mentions "+1/+1 counter" elsewhere (so we don't pick up
  // cards talking about charge/loyalty/age counters).
  it.each([
    ['{g}: level 2 permanents you control with counters on them have ward {1}. at the beginning of combat on your turn, put a +1/+1 counter on target creature you control.'],
    ['creatures you control with counters on them gain hexproof and indestructible. sacrifice this creature: those creatures keep their +1/+1 counter.'],
    ['draw a card if you control a creature with a counter on it. enters with a +1/+1 counter.'],
    ['each creature you control with a counter on it cannot be blocked by more than one creature. enters with a +1/+1 counter on it.'],
  ])('matches generic-counter phrasing when +1/+1 counter is mentioned: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['permanents you control with charge counters on them have ward'],
    ['planeswalker with a loyalty counter on it'],
    ['creature with a stun counter on it can attack'],
  ])('does not fire on generic-counter phrasing without +1/+1 in text: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
