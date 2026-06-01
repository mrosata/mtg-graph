import { describe, it, expect } from 'vitest';
import { rule } from './condition.void';

describe('condition.void', () => {
  it.each([
    // Hymn of the Faller
    ['void — if a nonland permanent left the battlefield this turn or a spell was warped this turn, draw another card.'],
    // Alpharael, Stonechosen
    ['void — whenever __self__ attacks, if a nonland permanent left the battlefield this turn, draw a card.'],
    // Chorale of the Void
    ['void — at the beginning of your end step, sacrifice this aura unless a nonland permanent left the battlefield this turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Bare leaves-battlefield condition without void marker
    ['if a nonland permanent left the battlefield this turn, draw a card.'],
    // Flavor / spell-name usage
    ['target creature enters the void.'],
    // "Targets target creature" in a different context
    ['void cannot hold a true mage.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
