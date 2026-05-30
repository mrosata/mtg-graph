import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_planeswalker';

describe('effect.destroy_planeswalker', () => {
  it.each([
    ['destroy target planeswalker'],
    ['destroy all planeswalkers'],
    ['destroy target creature or planeswalker'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonplaneswalker permanent'],
    ['destroy target creature'],
    ['exile target planeswalker'],
    ['planeswalker abilities you activate cost 1 less'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
