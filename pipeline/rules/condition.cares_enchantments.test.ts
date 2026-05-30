import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_enchantments';

describe('condition.cares_enchantments', () => {
  it.each([
    ['whenever you cast an enchantment spell, draw a card'],
    ['whenever an enchantment you control enters, scry 1'],
    ['for each enchantment you control, this creature gets +1/+1'],
    ['enchantments you control have ward 1'],
    ['if you control three or more enchantments, draw a card'],
    ['this spell costs 1 less to cast for each enchantment you control'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['destroy target enchantment'],                       // removal, not cares
    ['return target enchantment card from your graveyard to your hand'],
    ['this creature is an enchantment creature'],         // typeline-like text
    ['create a treasure token'],                          // unrelated
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
