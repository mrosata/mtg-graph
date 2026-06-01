// pipeline/rules/effect.forage.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.forage';

describe('effect.forage', () => {
  it.each([
    // Canonical "you may forage" optional action (Bushy Bodyguard, Curious
    // Forager, Corpseberry Cultivator, Treetop Sentries).
    ['when this creature enters, you may forage'],
    ['at the beginning of combat on your turn, you may forage'],
    // Activation-cost frame "Forage:" / "{T}, Forage:" (Thornvault Forager).
    ['{t}, forage: add two mana in any combination of colors'],
    // Alternative-cost frame "forage or pay {B}" (Feed the Cycle).
    ['as an additional cost to cast this spell, forage or pay {b}'],
    // Gerund "by foraging" (Osteomancer Adept).
    ['you may cast creature spells from your graveyard by foraging in addition to paying their other costs'],
    // Observer trigger "whenever you forage" (Corpseberry Cultivator).
    ['whenever you forage, put a +1/+1 counter on this creature'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // "Forager" is a creature subtype noun, not a forage reference. Word
    // boundary excludes it.
    ['curious forager'],
    ['this forager gains +1/+1'],
    // Plain card with no forage.
    ['create a food token'],
    ['exile three cards from your graveyard'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
