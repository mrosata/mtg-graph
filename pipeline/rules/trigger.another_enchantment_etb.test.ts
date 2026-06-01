// pipeline/rules/trigger.another_enchantment_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.another_enchantment_etb';

describe('trigger.another_enchantment_etb', () => {
  it.each([
    // Elvish Archivist
    ['whenever one or more enchantments you control enter, draw a card'],
    ['whenever an enchantment enters, scry 1'],
    ['whenever another enchantment you control enters, this creature gets +1/+1 until end of turn'],
    ['whenever an enchantment you control enters the battlefield, draw a card'],
    // Regression (Tanglespan Lookout): subtype-named enchantment — Aura is an
    // enchantment subtype, so "whenever an Aura … enters" is an enchantment-
    // ETB trigger.
    ['whenever an aura you control enters, draw a card'],
    // Other enchantment subtypes that follow the same pattern.
    ['whenever a saga you control enters, scry 1'],
    // v0.15 — intervening "with <stat-filter>" qualifier (consistency with
    // creature/artifact widening). Post-noun slot widened from 3 to 8.
    ['whenever another enchantment you control with mana value 3 or greater enters, draw a card'],
    // v0.15 — broad "noncreature, nonland permanents" framing (Builder's
    // Talent) is a superset that includes enchantments. Fires this trigger.
    ['whenever one or more noncreature, nonland permanents you control enter, put a +1/+1 counter on target creature you control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Wrong permanent type
    ['whenever a creature enters'],
    ['whenever an artifact you control enters'],
    // Self-ETB on an enchantment
    ['when this enchantment enters, draw a card'],
    // Static
    ['enchantments you control have hexproof'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
