import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_legendary';

describe('condition.cares_legendary', () => {
  it.each([
    // Bosco, Just a Bear
    ['when __self__ enters, create a food token for each legendary creature you control.'],
    // The Seriema
    ['legendary creatures you control have first strike.'],
    // Master's Guidance
    ['as long as you control two or more legendary creatures, this creature has indestructible.'],
    // Clive's Hideaway
    ['this land enters tapped unless you control four or more legendary creatures.'],
    // Hero's Blade
    ['equipped creature gets +3/+2. whenever a legendary creature you control enters, attach this to it.'],
    // Thancred Waters
    ['whenever a legendary permanent you control enters, draw a card.'],
    // Venat / Hydaelyn
    ['this spell costs {2} less to cast if you have cast a legendary spell this turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // No legendary reference
    ['put a +1/+1 counter on target creature.'],
    // Flavor adjective on a non-permanent noun
    ['the legendary tale of the lost city.'],
    // Negated form
    ['non-legendary creatures get +1/+1.'],
    // v0.43.0 — Sauron FP: "legendary creature" appears only inside a Ward
    // cost — the opponent pays it, not the controller. Must NOT fire.
    ['ward—sacrifice a legendary artifact or legendary creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
