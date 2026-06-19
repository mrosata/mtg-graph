import { describe, it, expect } from 'vitest';
import { rule } from './trigger.surveil';

describe('trigger.surveil', () => {
  it.each([
    // "whenever you surveil" trigger
    ['whenever you surveil, this creature gets +1/+1 until end of turn.'],
    // "first time each turn" variant
    ['whenever you surveil for the first time each turn, draw a card.'],
    // "if you've surveilled" conditional
    ["if you've surveilled this turn, this spell costs {1} less."],
    // "if you surveil" phrasing
    ['if you surveil this turn, draw a card.'],
    // "the first time you surveil" variant
    ['the first time you surveil each turn, you gain 1 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // This is the surveil effect, not the trigger
    ['surveil 2.'],
    // Unrelated trigger
    ['whenever you cast a spell, draw a card.'],
    // Surveil as an effect in end-step trigger (trigger-side is "at end step", not surveil payoff)
    ['at the beginning of your end step, surveil 1.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
