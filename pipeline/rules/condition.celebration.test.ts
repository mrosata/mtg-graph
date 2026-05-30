import { describe, it, expect } from 'vitest';
import { rule } from './condition.celebration';

describe('condition.celebration', () => {
  it.each([
    // Armory Mice
    ['celebration — this creature gets +0/+2 as long as two or more nonland permanents entered the battlefield under your control this turn.'],
    // Ash, Party Crasher — combat-triggered celebration
    ['haste celebration — whenever __self__ attacks, if two or more nonland permanents entered the battlefield under your control this turn, put a +1/+1 counter on __self__.'],
    // Goddric, Cloaked Reveler — long static
    ['celebration — as long as two or more nonland permanents entered the battlefield under your control this turn, __self__ is a dragon.'],
    // Lady of Laughter — end-step trigger
    ['flying celebration — at the beginning of your end step, if two or more nonland permanents entered the battlefield under your control this turn, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // No celebration ability-word marker
    ['if two or more nonland permanents entered the battlefield under your control this turn, draw a card.'],
    // Unrelated
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
    // The word "celebration" in flavor without the ability-word em-dash
    ['this is a celebration of the harvest.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
