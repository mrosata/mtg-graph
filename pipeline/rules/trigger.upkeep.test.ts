// pipeline/rules/trigger.upkeep.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.upkeep';

describe('trigger.upkeep', () => {
  it.each([
    // The Everflowing Well // The Myriad Pools: descend-gated transform.
    ['descend 8 — at the beginning of your upkeep, if there are eight or more permanent cards in your graveyard, transform __self__'],
    // Tithing Blade // Consuming Sepulcher back face: symmetric drain.
    ['at the beginning of your upkeep, each opponent loses 1 life and you gain 1 life'],
    // Cumulative-upkeep payoffs / classic upkeep triggers.
    ['at the beginning of your upkeep, draw a card'],
    // "Each upkeep" (broader scope).
    ['at the beginning of each upkeep, put a +1/+1 counter on this creature'],
    // "Each opponent's upkeep" — Howling Mine style.
    ["at the beginning of each opponent's upkeep, that player draws a card"],
    // "Target player's upkeep" — Future Sight oddball.
    ["at the beginning of target player's upkeep, exile the top card of their library"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Other phase triggers.
    ['at the beginning of your end step, draw a card'],
    ['at the beginning of combat on your turn, create a 1/1 soldier creature token'],
    ["at the beginning of each player's draw step, draw a card"],
    // Upkeep mentioned outside the "at the beginning of" anchor.
    ["doesn't untap during your untap step"],
    ['whenever you untap one or more permanents during your untap step'],
    // Unrelated.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
