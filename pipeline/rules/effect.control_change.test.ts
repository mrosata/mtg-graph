import { describe, it, expect } from 'vitest';
import { rule } from './effect.control_change';

describe('effect.control_change', () => {
  it.each([
    ['gain control of target creature'],
    ['gain control of target permanent'],
    ['you gain control of target artifact'],
    ['exchange control of two target creatures'],
    ['gain control of target nonland permanent'],
    ['gains control of target creature until end of turn'],
    ['gain control of another target creature'],
    // Coerced to Kill — Aura Control Magic template.
    ['enchant creature. you control enchanted creature'],
    // Variants for the Aura family.
    ['you control enchanted permanent'],
    ['you control attached creature'],
    ['you control equipped creature'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['creatures you control get +1/+1 until end of turn'],     // cares-about, not take-control
    ['this creature you control'],                              // self-reference
    ['draw a card'],                                            // unrelated
    ['destroy target creature'],                                // unrelated
    ['target creature you control gets +2/+0'],                 // bestowing on own creature
    ['target opponent controls a creature'],                    // opponent control, not gain
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
