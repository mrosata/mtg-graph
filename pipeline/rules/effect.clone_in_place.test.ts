import { describe, it, expect } from 'vitest';
import { rule } from './effect.clone_in_place';

describe('effect.clone_in_place', () => {
  it.each([
    // Deepfathom Echo
    ['you may have it become a copy of another creature you control until end of turn.'],
    // Generic becomes-a-copy of permanent
    ['__self__ becomes a copy of target creature.'],
    // Becomes a copy of any permanent
    ['target permanent becomes a copy of another permanent of your choice.'],
    // Mockingbird-style ETB-as-copy
    ['you may have this creature enter as a copy of any creature on the battlefield.'],
    // Echoing Deeps — "enter tapped as a copy of"
    ['you may have this land enter tapped as a copy of any land card in a graveyard.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Token-creating copy — handled by effect.copy_permanent_token
    ['create a token that is a copy of target creature.'],
    // Spell copy — handled by effect.copy_spell
    ['copy target instant or sorcery spell.'],
    // Plain ETB (no copy)
    ['__self__ enters the battlefield tapped.'],
    // Plain token creation (no copy)
    ['create a 1/1 white spirit creature token.'],
    // Unrelated
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
