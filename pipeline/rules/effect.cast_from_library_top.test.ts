import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_from_library_top';

describe('effect.cast_from_library_top', () => {
  it.each([
    // Assemble the Players
    ['you may cast a creature spell with power 2 or less from the top of your library.'],
    // Case of the Locked Hothouse
    ['you may play lands and cast creature and enchantment spells from the top of your library.'],
    // Generic Future Sight frame
    ['you may cast spells from the top of your library.'],
    // Vivien Champion style
    ['you may cast creature spells from the top of your library.'],
    // "play <thing> from the top" frame
    ['you may play the top card of your library if it\'s a land card.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Different zone — cast-from-graveyard is a different mechanic
    ['cast this card from your graveyard.'],
    // Reveal alone, no cast permission
    ['reveal the top card of your library. add one mana of any of its colors.'],
    // Impulse draw — exiles first, then "play that card this turn" — different axis
    ['exile the top three cards of your library. choose one of them. you may play that card this turn.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
