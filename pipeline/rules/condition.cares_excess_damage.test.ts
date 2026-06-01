// pipeline/rules/condition.cares_excess_damage.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_excess_damage';

describe('condition.cares_excess_damage', () => {
  it.each([
    // Boolean gate — "if excess damage was dealt this way, …"
    ['if excess damage was dealt to that creature this way, investigate'],
    ['if excess damage was dealt this way, create a lander token'],
    // Scaling on excess-damage count.
    ['create a number of tapped treasure tokens equal to the amount of excess damage dealt to that creature this way'],
    ['create a number of 1/1 red goblin creature tokens equal to the amount of excess damage dealt to that creature this way'],
    ['gain life equal to the excess damage dealt this way'],
    ['exile cards from the top of your library equal to the excess damage dealt this way'],
    // "When excess damage is dealt" trigger frame.
    ['when excess damage is dealt to the creature an opponent controls this way, destroy up to one target creature'],
    // Variable-X scaling with "that excess damage".
    ['discover x, where x is that excess damage'],
    // "Is dealt excess damage" passive frame (The Last Agni Kai).
    ['if the creature the opponent controls is dealt excess damage this way, add that much {r}'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Generic damage with no "excess" anchor — different axis (deals_damage).
    ['deals 3 damage to target creature'],
    ['this creature deals damage equal to its power'],
    // "Excess" in a non-damage context — flavor only, no real cards but
    // guard against drift.
    ['exile the excess cards from the top of your library'],
    // Generic.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
