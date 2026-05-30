import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_role';

describe('effect.create_role', () => {
  it.each([
    // Embereth Veteran
    ['create a young hero role token attached to another target creature'],
    // Faunsbane Troll
    ['create a monster role token attached to it'],
    // Eriette's Whisper
    ['create a wicked role token attached to up to one target creature you control'],
    // Other Eldraine roles
    ['create a cursed role token attached to target creature'],
    ['create a sorcerer role token attached to target creature you control'],
    ['create a virtuous role token attached to target creature you control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Wrong token type
    ['create a creature token'],
    ['create a treasure token'],
    ['create a food token'],
    ['create a 1/1 white soldier creature token'],
    // Consuming, not creating
    ['you control a role'],
    // Unrelated
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
