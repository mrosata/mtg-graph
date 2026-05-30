// pipeline/rules/trigger.landfall.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.landfall';

describe('trigger.landfall', () => {
  it.each([
    // Twists and Turns // Mycoid Maze: "when a land you control enters".
    ['when a land you control enters, if you control seven or more lands, transform this enchantment'],
    // Bare "whenever a land enters" — generic landfall.
    ['whenever a land enters, create a 1/1 green plant creature token'],
    // Modern "landfall —" ability word (classic Zendikar template).
    ['landfall — whenever a land you control enters, you gain 1 life'],
    // "When another land you control enters" — sibling shape.
    ['when another land you control enters, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Non-land ETBs — different axes.
    ['whenever a creature you control enters, draw a card'],
    ['whenever an artifact enters, scry 1'],
    // Land-leaves-battlefield — opposite axis.
    ['whenever a land you control leaves the battlefield, gain 1 life'],
    // Lands-care without ETB trigger — condition.cares_lands.
    ['if you control five or more lands, draw a card'],
    // Unrelated.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
