import { describe, it, expect } from 'vitest';
import { rule } from './trigger.explored';

describe('trigger.explored', () => {
  it.each([
    // Merfolk Cave-Diver
    ['whenever a creature you control explores, this creature gets +1/+0 until end of turn.'],
    // Nicanzil — split on what was revealed
    ['whenever a creature you control explores a land card, you may put a land card from your hand onto the battlefield tapped.'],
    ['whenever a creature you control explores a nonland card, put a +1/+1 counter on __self__.'],
    // Hypothetical / future card — whenever __self__ explores
    ['whenever __self__ explores, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Action without when/whenever frame — that's the effect side
    ['when this creature enters, it explores.'],
    ['target creature you control explores.'],
    // Unrelated
    ['draw a card.'],
    // Discover, not explore
    ['whenever you discover, draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
