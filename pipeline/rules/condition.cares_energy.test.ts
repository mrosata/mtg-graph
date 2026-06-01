import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_energy';

describe('condition.cares_energy', () => {
  it.each([
    // Aether Hub
    ['{t}, pay {e}: add one mana of any color.'],
    // Aetherwind Basker
    ['pay {e}: this creature gets +1/+1 until end of turn.'],
    // Aethertide Whale
    ["pay {e}{e}{e}{e}: return this creature to its owner's hand."],
    // Bespoke Battlewagon
    ['{t}, pay {e}{e}: tap target creature.'],
    // Saheeli, Radiant Creator
    ['at the beginning of combat on your turn, you may pay {e}{e}{e}.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Production, not spend
    ['when this land enters, you get {e}.'],
    // Generic mana pay
    ['pay {2}: draw a card.'],
    // No energy at all
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
