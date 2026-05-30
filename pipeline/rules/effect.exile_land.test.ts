import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_land';

describe('effect.exile_land', () => {
  it.each([
    ['exile target land'],
    ['exile target nonbasic land'],
    ['exile all lands'],
    ['exile target permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonland permanent'],
    ['exile target creature'],
    ['exile target land card from a graveyard'],
    ['destroy target land'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
