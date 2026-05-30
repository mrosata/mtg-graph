// pipeline/rules/effect.has_activated_ability.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_activated_ability';
import type { Card } from '../../shared/types';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

describe('effect.has_activated_ability', () => {
  it.each([
    // Llanowar Elves: classic tap-for-mana
    ['{T}: Add {G}.'],
    // Agatha of the Vile Cauldron: mana-only activated anthem
    ["Activated abilities of creatures you control cost {X} less to activate, where X is Agatha's power. {4}{R}{G}: Other creatures you control get +1/+1 and gain trample and haste until end of turn."],
    // Stoneforge Mystic: multi-component cost (mana + tap + sacrifice)
    ['When this creature enters, you may search your library for an Equipment card. {1}, {T}, Sacrifice this creature: Search your library for an Equipment card with mana value 4 or less, put it onto the battlefield, then shuffle.'],
    // Mana dork with non-tap cost
    ['{2}{G}: Add {G}{G}.'],
    // Variable mana cost
    ['{X}, {T}: __SELF__ deals X damage to any target.'],
    // Tap-only with split mana payload
    ['{T}: Add {W} or {B}.'],
  ])('matches creatures with an activated ability: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBeTruthy();
  });

  it.each([
    // Vanilla creature
    [''],
    // Triggered-only (ETB)
    ['When this creature enters, draw a card.'],
    // Triggered-only (attack)
    ['Whenever this creature attacks, it gets +1/+1 until end of turn.'],
    // Static-only (Goreclaw-style cost reducer with no activated ability)
    ['Trample. Each creature spell you cast with power 4 or greater costs {2} less to cast.'],
    // Anthem static (no activation)
    ['Other creatures you control get +1/+1.'],
    // Mention of {T} as a flavor-style trigger (not an activation cost)
    ['Whenever this creature becomes tapped, draw a card.'],
  ])('does not match creatures without an activated ability: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBe(false);
  });

  // Regression (Prophetic Prism, and the broader non-creature {T}: activation
  // family): the rule originally scoped to creatures only, missing artifact /
  // enchantment / land / planeswalker activations. Activated-ability payoffs
  // (Training Grounds, Mishra/Goldspan, Inspiring Statuary) care about ALL
  // permanent-type activations, not just creatures.
  it.each([
    // Prophetic Prism — tap-cost mana fixing on a colorless artifact
    [['Artifact'], 'Artifact', '{1}, {T}: Add one mana of any color.'],
    // Glaring Spotlight — artifact sacrifice activation
    [['Artifact'], 'Artifact', '{2}, Sacrifice this artifact: Creatures you control gain hexproof until end of turn.'],
    // Static Discharge-style enchantment activation
    [['Enchantment'], 'Enchantment', '{2}{R}: This enchantment deals 1 damage to any target.'],
    // Manland-shaped activation (Restless Bivouac creature-becoming activation)
    [['Land'], 'Land', '{1}{R}{W}: This land becomes a 2/2 red and white Ox creature until end of turn. It\'s still a land.'],
    // Planeswalker loyalty abilities use ±N: format, but a non-loyalty activated
    // ability with a real mana cost should still fire (e.g. some PWs and
    // legendary planeswalker variants).
    [['Planeswalker'], 'Legendary Planeswalker — Jace', '{2}{U}, {T}: Draw a card.'],
  ])('matches non-creature permanents with activated abilities: types=%s', (types, typeLine, oracleText) => {
    expect(rule.matchCard!(card({ types: types as string[], typeLine, oracleText }))).toBeTruthy();
  });

  it('does not match instants or sorceries (not permanents)', () => {
    // Spells aren't permanents — their "costs" are spell costs, not activations.
    const c = card({
      types: ['Instant'],
      typeLine: 'Instant',
      oracleText: '{2}{U}: Counter target spell.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  it('matches artifact creatures (multi-type) with activated abilities', () => {
    const c = card({
      types: ['Artifact', 'Creature'],
      typeLine: 'Artifact Creature — Construct',
      oracleText: '{2}, {T}: Draw a card.',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });

  it('returns the matched activation cost as evidence', () => {
    const result = rule.matchCard!(card({ oracleText: '{T}: Add {G}.' }));
    expect(result).toMatchObject({ evidence: expect.stringContaining(':') });
  });

  // Regression (v0.12.9): spelled-out non-symbol activation costs. Some cards
  // use prose-form costs that don't contain {mana}/{T} symbols at all —
  // "Sacrifice X: ...", "Discard a card: ...", "Tap N untapped X: ...".
  // These are activated abilities by the cost-colon-effect frame, so the
  // tag should fire.
  it.each([
    // Bartolomé del Presidio: sacrifice-as-only-cost activation
    [['Creature'], 'Creature — Vampire Knight', 'Sacrifice another creature or artifact: Put a +1/+1 counter on __SELF__.'],
    // Adaptive Gemguard: spelled-out "Tap N untapped X" cost (convoke-shaped)
    [['Artifact', 'Creature'], 'Artifact Creature — Gnome', 'Tap two untapped artifacts and/or creatures you control: Put a +1/+1 counter on this creature. Activate only as a sorcery.'],
    // Spelled-out discard-as-cost activation
    [['Creature'], 'Creature — Wizard', 'Discard a card: Draw a card.'],
    // Pay-life-as-cost activation (Phyrexian-style)
    [['Creature'], 'Creature — Horror', 'Pay 2 life: This creature gains hexproof until end of turn.'],
    // v0.14.6 — Case Solved-prefix activation (Case of the Uneaten Feast).
    // The cost-colon sits after an em-dash subheader ("Solved — Sacrifice
    // this Case:"). The em dash and similar dash-prefixed clauses (ability-
    // word headers like "Descend —", "Solved —", "Channel —") should be
    // recognized as a sentence-like anchor too.
    [['Enchantment'], 'Enchantment — Case', 'Whenever a creature you control enters, you gain 1 life. To solve — You have gained 5 or more life this turn. Solved — Sacrifice this Case: Creature cards in your graveyard gain "You may cast this card from your graveyard" until end of turn.'],
  ])('matches spelled-out non-symbol activation costs: oracle=%s', (types, typeLine, oracleText) => {
    expect(rule.matchCard!(card({ types: types as string[], typeLine, oracleText }))).toBeTruthy();
  });

  // Sentence-START anchor must hold — don't fire on prose mid-sentence that
  // happens to contain "sacrifice X:" or "discard a card:".
  it.each([
    // Mid-sentence "sacrifice X" inside a triggered ability
    ['Whenever this creature attacks, sacrifice it: it deals 2 damage to any target.'],
    // Triggered-only with a colon-bearing reminder-like clause
    ['When this creature enters, draw a card.'],
  ])('does not match prose colons mid-sentence: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBe(false);
  });

  // v0.14.10 — keyword activation costs whose reminder text is stripped
  // before the regex sees them. Equip and Crew expand to "{cost}: Attach
  // to / Tap N creatures: Vehicle becomes a creature" — both are
  // battlefield-zone activated abilities. The reminder-text path is
  // unreachable post-normalization, so we short-circuit on the
  // card's keyword list. Covers ~102 Equipment + ~72 Vehicles in Standard.
  it.each([
    // Equipment whose only on-battlefield activated ability is Equip.
    // (Bespoke Battlegarb has additional triggers, but its activated
    // ability is the Equip keyword.)
    [['Artifact'], 'Artifact — Equipment', ['Equip'], 'Equipped creature gets +2/+0.\nEquip {2}'],
    // Bare Equipment with no other text
    [['Artifact'], 'Artifact — Equipment', ['Equip'], 'Equipped creature gets +1/+1.\nEquip {3}'],
    // Vehicle (Crew is the activated ability — drive the vehicle)
    [['Artifact'], 'Artifact — Vehicle', ['Crew'], 'Flying\nCrew 3'],
  ])('matches keyword-cost activations (Equip/Crew): keywords=%s', (types, typeLine, keywords, oracleText) => {
    expect(rule.matchCard!(card({ types: types as string[], typeLine, keywords: keywords as string[], oracleText }))).toBeTruthy();
  });

  it('does not match an Aura whose only activated-ability keyword is Enchant', () => {
    // "Enchant creature" is a static ability, not an activation. Make sure we
    // didn't accidentally pick up arbitrary keywords.
    const c = card({
      types: ['Enchantment'],
      typeLine: 'Enchantment — Aura',
      keywords: ['Enchant'],
      oracleText: 'Enchant creature\nEnchanted creature gets +2/+2.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });
});
