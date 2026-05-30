import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_enchantment';
import type { Card } from '../../shared/types';

function card(types: string[], oracleText: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.sacrifice_enchantment', () => {
  it.each([
    ['sacrifice an enchantment'],
    ['sacrifice another enchantment'],
    ['sacrifice target enchantment'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
    // Regression: Bargain phrasing — Devouring Sugarmaw / multiple Bargain cards.
    // Multi-type sac lists where "enchantment" appears mid-list with commas.
    ['sacrifice an artifact, enchantment, or token'],
    ['sacrifice a creature, an enchantment, or a land'],
    ['you may sacrifice an artifact, enchantment, or token as you cast this spell'],
    // Regression: Faunsbane Troll — "Sacrifice an Aura attached to this
    // creature" sacrifices an Aura, which IS an enchantment subtype.
    ['{1}, sacrifice an aura attached to this creature'],
    ['sacrifice an aura you control'],
    ['sacrifice target aura'],
    // Case of the Uneaten Feast — "Sacrifice this Case:" self-sac on enchantment subtype.
    ['solved — sacrifice this case: creature cards in your graveyard gain you may cast this card from your graveyard'],
    // Saga self-sac variant.
    ['sacrifice this saga: draw three cards'],
    // Class / Room / Shrine / Role / Background — other enchantment subtypes.
    ['sacrifice this class: deal 3 damage to any target'],
    ['sacrifice this room: scry 2'],
    ['sacrifice this shrine: mill 5'],
    ['sacrifice this role: gain 2 life'],
    ['sacrifice this background: draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonenchantment permanent'],
    ['sacrifice a creature'],
    ['sacrifice a land'],
    ['destroy target enchantment'],
    // Don't FP on "Sacrifice a creature, then create an aura..." — the
    // sacrifice action is on the creature; the aura is part of a later
    // create-token clause.
    ['sacrifice a creature, then create an aura'],
    // v0.14.1 — edict leak. Throne of the Grim Captain.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression: Case of the Uneaten Feast — "Solved — Sacrifice this Case: ..."
  // The normalizer rewrites "this Case" to "this __self__" because "Case" is
  // a name-segment of "Case of the Uneaten Feast" (split on " of "). Text-only
  // matching misses these; matchCard ANDs type_line.Enchantment with the
  // self-sac fragment.
  it('matchCard: fires on "sacrifice this __self__" when card type includes Enchantment', () => {
    const c = card(['Enchantment'], 'solved — sacrifice this __self__: creature cards in your graveyard gain you may cast this card from your graveyard');
    expect(rule.matchCard!(c, c.oracleText)).toBeTruthy();
  });

  it('matchCard: fires on bare "sacrifice __self__:" on an Enchantment', () => {
    const c = card(['Enchantment'], '{2}, sacrifice __self__: draw a card');
    expect(rule.matchCard!(c, c.oracleText)).toBeTruthy();
  });

  it('matchCard: does not fire on self-sac when card is not an Enchantment', () => {
    const c = card(['Artifact'], '{2}, {t}, sacrifice __self__: you gain 3 life');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('matchCard: does not fire on Enchantment without self-sac', () => {
    const c = card(['Enchantment'], 'enchanted creature gets +1/+1');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
