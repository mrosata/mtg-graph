import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_cards_drawn_this_turn';

describe('condition.cares_cards_drawn_this_turn', () => {
  it.each([
    // Galvanize (MKM): cumulative-gate scaling — "if you've drawn N+ cards
    // this turn, the spell deals N more damage instead".
    ["if you've drawn two or more cards this turn, __self__ deals 5 damage to that creature instead"],
    // Variant: "you have" (no contraction)
    ['if you have drawn three or more cards this turn, draw an additional card'],
    // "as long as" static gate
    ["as long as you've drawn two or more cards this turn, creatures you control get +1/+1"],
    // Per-card scaling
    ["for each card you've drawn this turn, this creature gets +1/+0"],
    // Static count reference
    ["this creature's power equals the number of cards you've drawn this turn"],
    // X-scaling
    ["where x is the number of cards you have drawn this turn"],
    // v0.14.9 — Regression (Jaded Analyst): ordinal "your Nth card each
    // turn" frame. Same axis (count of cards drawn this turn) — the trigger
    // fires when you cross the Nth draw.
    ['whenever you draw your second card each turn, this creature loses defender'],
    ['whenever you draw your third card each turn, draw an additional card'],
    ['whenever you draw your first card each turn, create a clue token'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain draw effect — doesn't reference cards-drawn-this-turn as a payoff
    ['draw two cards'],
    ['draw a card'],
    // Trigger on the moment of drawing — that's trigger.card_drawn_discarded
    ['whenever you draw a card, this creature gets +1/+1 until end of turn'],
    // Generic "this turn" mention not tied to drawn-cards
    ['target creature gets +2/+2 until end of turn'],
    // Discard-this-turn is a different axis
    ["if you've discarded a card this turn, draw a card"],
    // Loot effect
    ['draw a card, then discard a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
