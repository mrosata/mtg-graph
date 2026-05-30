import { describe, it, expect } from 'vitest';
import { rule } from './effect.copy_permanent_token';

describe('effect.copy_permanent_token', () => {
  it.each([
    // Cackling Counterpart shape
    ['create a token that is a copy of target creature.'],
    // Mirror March shape with adjectives
    ['create a tapped and attacking token that is a copy of target creature you control.'],
    // Numeric count
    ['create two tokens that are copies of target nonlegendary creature.'],
    // "X" count
    ['create x tokens that are copies of target creature.'],
    // Apprentice's Folly-style with copy of "it"
    ['create a token that is a copy of __self__, except it is not legendary.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // In-place clone — handled by effect.clone_in_place
    ['__self__ becomes a copy of another creature you control until end of turn.'],
    // Enter as a copy — handled by effect.clone_in_place
    ['you may have this creature enter as a copy of any creature on the battlefield.'],
    // Spell copy — handled by effect.copy_spell
    ['copy target instant or sorcery spell.'],
    // Plain token creation (no copy)
    ['create a 1/1 white spirit creature token.'],
    // Unrelated
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
