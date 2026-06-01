// pipeline/rules/trigger.expend.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.expend';

describe('trigger.expend', () => {
  it.each([
    // Canonical BLB expend trigger frame. The reminder text "(You expend N
    // as you spend your Nth total mana to cast spells during a turn.)" is
    // stripped pre-tagging, so only the "whenever you expend N, …" trigger
    // line remains.
    ['whenever you expend 4, this creature gets +1/+1 until end of turn'],
    ['whenever you expend 4, this creature gains indestructible until end of turn'],
    ['whenever you expend 4, raccoons you control get +1/+1 and gain vigilance until end of turn'],
    ['whenever you expend 6, gain control of up to one target artifact for as long as you control this creature'],
    ['whenever you expend 8, return up to one target permanent card from your graveyard to your hand'],
    // ETB-and-expend combined frame (Hoarder's Overflow): "when this
    // enchantment enters and whenever you expend 4, put a stash counter on it"
    ['when this enchantment enters and whenever you expend 4, put a stash counter on it'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Not expend — different mechanic word.
    ['whenever you spend mana, draw a card'],
    ['expend this card from your graveyard'],
    // Plain card with no expend.
    ['whenever you cast a spell, scry 1'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
