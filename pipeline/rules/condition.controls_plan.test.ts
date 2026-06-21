import { describe, it, expect } from 'vitest';
import { rule } from './condition.controls_plan';

describe('condition.controls_plan', () => {
  it.each([
    // Doctor Doom's exact normalized text
    ['as long as you control an artifact creature or a plan, __self__ has indestructible.'],
    // conditional with "an" + plan reference
    ['whenever you control an enchantment creature or a plan, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Masters of Evil: tutor for plan cards (not a control payoff) — must NOT match
    ['search your library for a plan card, reveal it, put it into your hand, then shuffle.'],
    // Plan enchantments: "put a plan counter on this enchantment" — must NOT match
    ['landfall — whenever a land you control enters, put a +1/+1 counter on target creature you control and a plan counter on this enchantment.'],
    ['whenever you draw your second card each turn, create a 2/1 black villain creature token with menace and put a plan counter on this enchantment.'],
    ['when the fourth plan counter is put on this enchantment, sacrifice it.'],
    // generic text with no plan reference
    ['flying\ndraw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
