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
    // Fix D — blink-frame: "exile target land, then return that card to the
    // battlefield." FLICKER_TAIL must suppress land exile.
    ['exile target land you control, then return that card to the battlefield.'],
    ['exile target land. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
