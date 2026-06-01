import { describe, it, expect } from 'vitest';
import { rule } from './effect.give_poison_counters';

describe('effect.give_poison_counters', () => {
  it.each([
    // Fynn, the Fangbearer — normalized form (reminder text stripped).
    ['deathtouch whenever a creature you control with deathtouch deals combat damage to a player, that player gets two poison counters.'],
    // Persuasive Interrogators.
    ['when this creature enters, investigate. whenever you sacrifice a clue, target opponent gets two poison counters.'],
    // Virulent Silencer.
    ['whenever a nontoken artifact creature you control deals combat damage to a player, that player gets two poison counters.'],
    // Bloodroot Apothecary — second clause direct give.
    ['whenever an opponent sacrifices a noncreature token, that player gets two poison counters.'],
    // Vraska, Betrayal's Sting — variable amount via "a number of".
    ['if target player has fewer than nine poison counters, they get a number of poison counters equal to the difference.'],
    // Numeric variants — synthetic but valid frames.
    ['target opponent gets three poison counters.'],
    ['each opponent gets a poison counter.'],
    ['that player gets x poison counters.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Wrong counter type.
    ['put a +1/+1 counter on target creature'],
    // Loyalty counter.
    ['put two loyalty counters on this planeswalker'],
    // Removal direction (opposite axis).
    ['remove a poison counter from target player'],
    // Mere mention of poison (e.g. condition gate).
    ['for each poison counter on that player, draw a card'],
    // Unrelated.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
