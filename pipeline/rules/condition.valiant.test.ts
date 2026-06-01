// pipeline/rules/condition.valiant.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.valiant';

describe('condition.valiant', () => {
  it.each([
    // Canonical BLB ability-word frame: literal "valiant" followed by an
    // em-dash (U+2014). Heartfire Hero, Emberheart Challenger, Mouse Trapper.
    ['valiant — whenever this creature becomes the target of a spell or ability you control for the first time each turn, put a +1/+1 counter on it'],
    ['valiant — whenever this creature becomes the target of a spell or ability you control for the first time each turn, exile the top card of your library'],
    ['valiant — whenever this creature becomes the target of a spell or ability you control for the first time each turn, mice you control get +1/+0 until end of turn'],
    ['valiant — whenever this creature becomes the target of a spell or ability you control for the first time each turn, tap target creature an opponent controls'],
    ['valiant — whenever this creature becomes the target of a spell or ability you control for the first time each turn, it gets +0/+2 until end of turn'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Flavor noun "a valiant" / "valiant <noun>" must NOT match — the
    // em-dash anchor is required. (No straight-hyphen leak either.)
    ['a valiant defender stands at the gate'],
    ['valiant defender'],
    ['valiant - whenever this creature'], // straight hyphen, no em-dash
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
