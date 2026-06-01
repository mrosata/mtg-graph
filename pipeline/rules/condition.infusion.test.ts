import { describe, it, expect } from 'vitest';
import { rule } from './condition.infusion';

describe('condition.infusion', () => {
  it.each([
    // Poisoner's Apprentice
    ['infusion — when this creature enters, target creature an opponent controls gets -4/-4 until end of turn if you gained life this turn.'],
    // Efflorescence
    ['infusion — if you gained life this turn, that creature also gains trample and indestructible until end of turn.'],
    // Follow the Lumarets
    ['infusion — look at the top four cards of your library.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Bare lifegain condition without infusion marker
    ['if you gained life this turn, draw a card.'],
    // Flavor noun
    ['the alchemist prepared a healing infusion.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
