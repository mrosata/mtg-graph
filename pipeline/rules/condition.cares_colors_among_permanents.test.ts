// pipeline/rules/condition.cares_colors_among_permanents.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_colors_among_permanents';

describe('condition.cares_colors_among_permanents', () => {
  it.each([
    // Vivid power-scaling
    ["__self__'s power is equal to the number of colors among permanents you control"],
    // Vivid cost reduction
    ['this spell costs {1} less to cast for each color among permanents you control'],
    // 5-color gate
    ['activate only if there are five colors among permanents you control'],
    // Multicolored trigger
    ['whenever you cast a multicolored spell, draw a card'],
    // Sunburst-like
    ['put a +1/+1 counter on it for each color of mana spent to cast it'],
    // Opponents variant
    ['for each color among permanents your opponents control, you gain 1 life'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Color-of-the-spell without "permanents" scope
    ['target creature gets +1/+1 for each color of mana'],
    // Color-cares for a single specific color
    ['whenever you cast a blue spell, draw a card'],
    // Plain mana-of-any-color
    ['add one mana of any color'],
    // Color identity (different axis)
    ['this card has color identity of three colors'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
