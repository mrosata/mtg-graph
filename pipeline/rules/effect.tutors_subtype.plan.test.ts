import { describe, it, expect } from 'vitest';
import { rule } from './effect.tutors_subtype.plan';

describe('effect.tutors_subtype.plan', () => {
  it.each([
    // The Masters of Evil
    ['search your library for a plan card, reveal it, put it into your hand, then shuffle.'],
    // third-person searches template
    ['target player searches their library for a plan card and puts it onto the battlefield.'],
    // chained tutor with an intervening object
    ['search your library for a basic land card and a plan card, reveal them, and put them into your hand.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // plan-counter enchantments must NOT match
    ['landfall — whenever a land you control enters, put a plan counter on this enchantment.'],
    // controls-a-plan payoff (Doctor Doom) — belongs to condition.controls_plan
    ['as long as you control an artifact creature or a plan, __self__ has indestructible.'],
    // tutoring something else entirely
    ['search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
