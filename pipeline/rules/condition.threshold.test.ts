// pipeline/rules/condition.threshold.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.threshold';

describe('condition.threshold', () => {
  it.each([
    // Ability-word header with em-dash (canonical OD templating)
    ['threshold — __self__ gets +3/+3 and has trample'],
    // Ability-word header with straight hyphen (legacy text)
    ['threshold - this creature gets +1/+1'],
    // Bare static gate (Crypt Feaster shape)
    ['as long as seven or more cards are in your graveyard, this creature gets +2/+2'],
    // Possessive variant
    ['if seven or more cards are in your graveyard, draw two cards'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Other graveyard-cares phrasings — handled by condition.cares_graveyard
    ['for each card in your graveyard'],
    ['if there are five or more creature cards in your graveyard'],
    // Generic threshold-ish word in a non-MTG sense
    ['return target creature to its owner\'s hand'],
    // "seven" without the graveyard anchor
    ['put seven +1/+1 counters on target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
