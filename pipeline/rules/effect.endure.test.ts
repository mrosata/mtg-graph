import { describe, it, expect } from 'vitest';
import { rule } from './effect.endure';

describe('effect.endure', () => {
  it.each([
    // Inspirited Vanguard
    ['whenever this creature enters or attacks, it endures 2.'],
    // Anafenza, Unyielding Lineage
    ['whenever another nontoken creature you control dies, __self__ endures 2.'],
    // Descendant of Storms
    ['whenever this creature attacks, you may pay {1}{w}. if you do, it endures 1.'],
    // Dusyut Earthcarver
    ['when this creature enters, it endures 3.'],
    // X variant
    ['__self__ endures x, where x is the number of creatures you control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // No "endure" keyword
    ['put a +1/+1 counter on this creature.'],
    // Flavor verb without numeric argument
    ['the wall endures through the ages.'],
    // Adjacent word (no number)
    ['no creatures shall endure.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
