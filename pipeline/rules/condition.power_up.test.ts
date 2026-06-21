import { describe, it, expect } from 'vitest';
import { rule } from './condition.power_up';

describe('condition.power_up', () => {
  it.each([
    // standard keyword ability line
    ['trample\npower-up — {5}{r/g}{r/g}: put a +1/+1 counter on __self__. he fights up to one target creature an opponent controls. (activate each power-up ability only once.)'],
    // another power-up creature
    ['flash\nflying, lifelink\npower-up — {5}{w}{w}: put a +1/+1 counter and an indestructible counter on __self__. (activate each power-up ability only once.)'],
    // Hulk — references "power-up abilities" (cost reducer, not the ability itself)
    ['reach, trample\npower-up abilities of other creatures you control cost {3} less to activate.\npower-up — {6}{r}{g}: put five +1/+1 counters on __self__.'],
    // minimal positive
    ['power-up — {4}{g}: put a +1/+1 counter on __self__. he gains vigilance, indestructible, and haste until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['flying\ndraw a card'],
    ['put a +1/+1 counter on target creature'],
    ['activate this ability only once each turn'],
    ['choose one — • double target creature\'s power and toughness until end of turn'],
    ['creatures you control get +2/+2 until end of turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
