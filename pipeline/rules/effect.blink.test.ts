import { describe, it, expect } from 'vitest';
import { rule } from './effect.blink';

describe('effect.blink', () => {
  it.each([
    // Go Ninja Go — exile + immediate return.
    ["exile target creature you control, then return it to the battlefield under its owner's control."],
    // Classic blink template — comma + then form.
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    // Period-separator form.
    ['exile target creature, then return it to the battlefield.'],
    // "Exile another target creature you control, then return it to the battlefield"
    ['exile another target creature you control, then return that card to the battlefield under its owner\'s control'],
    // Gossip's Talent (level 3) — pronoun-anchored flicker via combat-damage
    // trigger; immediate return (no end-step delay) → blink.
    ['whenever a creature you control deals combat damage to a player, you may exile it, then return it to the battlefield under its owner\'s control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain bounce.
    ["return target creature to its owner's hand"],
    // Flicker (delayed return) — handled by effect.flicker.
    ["exile another target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    ['exile target creature. return it to the battlefield at the beginning of the next end step.'],
    // Reanimate — graveyard source.
    ['return target creature card from your graveyard to the battlefield.'],
    // Exile only, no return.
    ['exile target creature'],
    // Destroy.
    ['destroy target creature.'],
    // Return to hand (bounce-back like Anzrag's Rampage).
    ['you may put a creature card exiled this way onto the battlefield. it gains haste. return it to your hand at the beginning of the next end step'],
    // Negative for pronoun arm: no "creature" antecedent in the same sentence.
    ['target artifact: exile it, then return it to the battlefield under its owner\'s control'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
