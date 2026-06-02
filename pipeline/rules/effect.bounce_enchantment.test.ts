import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_enchantment';
import type { Card } from '../../shared/types';

function card(types: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.bounce_enchantment', () => {
  it.each([
    ['return target enchantment to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    // v0.21.0 — Get Out: "one or two target creatures and/or enchantments you
    // own to your hand". Count slot admits "one or two" and "up to two".
    ['return one or two target creatures and/or enchantments you own to your hand'],
    // 2026-06-01 audit batch — broad-permanent bounce with count slot.
    ["return up to two other target nonland permanents to their owners' hands"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonenchantment permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target enchantment card from your graveyard'],
    ['destroy target enchantment'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // 2026-06-01 audit batch — Ishgard, the Holy See: graveyard recursion of
    // artifact and/or enchantment cards is NOT bounce_enchantment.
    ['return up to two target artifact and/or enchantment cards from your graveyard to your hand'],
    // 2026-06-02 audit Wave 2 — exile + return-to-battlefield is FLICKER
    // (delayed) or BLINK (immediate), not bounce. Mirrors the narrowing
    // already applied to effect.bounce_creature / effect.bounce_artifact.
    ['exile target enchantment, then return that enchantment to the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // FIX 7 (BR-2) — Angelic Destiny: self-bounce via `matchCard` gated on
  // Enchantment type. The aura's death trigger reads "return this card to
  // its owner's hand" — semantically a self-bounce of the enchantment.
  // Type-gated so plain "return this card to its owner's hand" on a
  // creature card (Bramble Familiar self-bounce) doesn't FP this enchantment-
  // axis tag.
  it('matchCard fires for self-bounce "return this card" on Enchantment', () => {
    const text = "enchant creature\nenchanted creature gets +4/+4, has flying and first strike, and is an angel in addition to its other types.\nwhen enchanted creature dies, return this card to its owner's hand.";
    expect(rule.matchCard!(card(['Enchantment'], text), text)).toBeTruthy();
  });

  it('matchCard does NOT fire for "return this card to its owner\'s hand" on a Creature', () => {
    const text = "at the beginning of your end step, return this card to its owner's hand.";
    expect(rule.matchCard!(card(['Creature'], text), text)).toBe(false);
  });
});
