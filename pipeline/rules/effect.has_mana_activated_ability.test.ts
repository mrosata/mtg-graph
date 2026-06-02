// pipeline/rules/effect.has_mana_activated_ability.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_mana_activated_ability';
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

describe('effect.has_mana_activated_ability', () => {
  // A "mana activated ability" is one whose cost can actually be reduced by
  // Training Grounds / Heartstone / Agatha. The cost segment (everything from
  // the leading symbol/verb up to the `:`) must contain a mana-bearing symbol
  // (W/U/B/R/G/C/X or a digit). Tap-only / untap-only / snow-only activations
  // do NOT match — Training Grounds cannot reduce them. Prose costs (pure
  // Sacrifice / Discard / Pay life) also fail unless they include a mana
  // symbol.
  it.each([
    ['{2}{G}: Add {G}{G}.'],
    ['{X}, {T}: __SELF__ deals X damage to any target.'],
    ['{1}, {T}, Sacrifice this creature: Search your library for an Equipment card.'],
    // Tap-paired-with-mana — first symbol is {T}, but the cost segment also
    // contains {1}, so the ability IS reducible by Training Grounds.
    ['{T}, {1}: Draw a card.'],
  ])('matches symbol-cost activations: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBeTruthy();
  });

  it.each([
    [''],
    ['When this creature enters, draw a card.'],
    ['Whenever this creature attacks, it gets +1/+1 until end of turn.'],
    ['Other creatures you control get +1/+1.'],
  ])('does not match non-activated text: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBe(false);
  });

  // Regression (Tunnel Tipster, Lonely Arroyo, Oasis Gardener, Mirage Mesa,
  // Sandstorm Verge, Soured Springs, Lush Oasis, and every basic land):
  // tap-only mana activations are NOT mana-cost-reducible. The cost segment
  // contains only {T} (or {Q}/{S}), no W/U/B/R/G/C/X/digit.
  it.each([
    ['{T}: Add {G}.'],
    ['{T}: Add {W} or {U}.'],
    ['{T}: Add one mana of any color.'],
    ['{Q}: Add {U}.'],
  ])('does not match tap-only or untap-only mana activations: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBe(false);
  });

  // Regression (Magda, the Hoardmaster; Rakdos, the Muscle): sacrifice-as-cost
  // activations have no mana component. Training Grounds cannot reduce them.
  it.each([
    ['Sacrifice three Treasures: Create a 4/4 red Scorpion Dragon creature token with flying and haste. Activate only as a sorcery.'],
    ['Sacrifice another creature: __SELF__ gains indestructible until end of turn. Tap it. Activate only once each turn.'],
    ['Discard a card: Draw a card.'],
    ['Pay 2 life: Add {B}.'],
  ])('does not match prose-cost activations with no mana: %s', (oracleText) => {
    expect(rule.matchCard!(card({ oracleText }))).toBe(false);
  });

  // Equip's cost is mana ("Equip {2}"); Training Grounds-style reducers do
  // apply to Equip. So Equip-keyword cards SHOULD match the mana-activated
  // variant, just like they match the broad effect.has_activated_ability.
  it('matches Equipment with only the Equip keyword (mana cost)', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Equipment',
      keywords: ['Equip'],
      oracleText: 'Equipped creature gets +2/+0.\nEquip {2}',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });

  // Crew's cost is "tap N creatures with total power M+" — NOT mana. So
  // mana-cost reducers cannot reduce Crew, and pure-Crew vehicles must not
  // carry effect.has_mana_activated_ability. This is the entire point of
  // splitting this tag off from effect.has_activated_ability.
  it('does not match a pure-Crew Vehicle (no symbol/prose activation)', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Vehicle',
      keywords: ['Crew'],
      oracleText: 'Flying\nCrew 3',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  // A Vehicle that ALSO has a real mana-bearing activation should match —
  // the cost segment includes a mana symbol. Crew alone is not the
  // disqualifier; the test is whether ANY mana-bearing activation exists.
  it('matches a Vehicle with Crew AND a mana-bearing symbol-cost activation', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Vehicle',
      keywords: ['Crew'],
      oracleText: '{1}, {T}: Add one mana of any color.\nCrew 3',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });

  // Cultivator's-Caravan-shaped: Crew + a TAP-ONLY mana activation. Per the
  // strict definition, neither cost is reducible by Training Grounds (Crew
  // costs creatures; {T} alone has no mana). The rule must NOT fire — even
  // though the card visibly has two activated abilities.
  it('does not match a Vehicle with Crew AND a tap-only mana activation', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Vehicle',
      keywords: ['Crew'],
      oracleText: '{T}: Add one mana of any color.\nCrew 3',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  it('does not match instants or sorceries', () => {
    const c = card({
      types: ['Instant'],
      typeLine: 'Instant',
      oracleText: '{2}{U}: Counter target spell.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  it('matches non-creature permanents with activations', () => {
    const c = card({
      types: ['Land'],
      typeLine: 'Land',
      oracleText: '{1}{R}{W}: This land becomes a 2/2 creature until end of turn.',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });

  // v0.20 — Tender Wildguide regression: Offspring {2}'s cost is a KEYWORD
  // cost, not an activation cost. After newline collapse, the normalized
  // text reads "offspring {2} {t}: add one mana of any color. {t}: put ..."
  // and the activation-symbol regex greedily binds {2} to the next {T}:
  // ability. Both real activations are TAP-ONLY (no mana cost), so the
  // card has no mana-cost-reducible activation. Must NOT match.
  it('does not match Tender Wildguide (Offspring keyword cost + tap-only activations)', () => {
    const c = card({
      types: ['Creature'],
      typeLine: 'Creature — Possum Druid',
      keywords: ['Offspring'],
      oracleText: 'Offspring {2}\n{T}: Add one mana of any color.\n{T}: Put a +1/+1 counter on this creature.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  // v0.20.0 — Dissection Tools regression: Equipment with em-dash cost
  // ("Equip—Sacrifice a creature") has no mana component. Training Grounds
  // cannot reduce it. The keyword short-circuit must gate on the oracle
  // text actually showing a mana form ("Equip {N}") before firing.
  it('does not match Equipment whose Equip cost is non-mana (Dissection Tools)', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Equipment',
      keywords: ['Equip'],
      oracleText:
        'When this Equipment enters, manifest dread, then attach this Equipment to that creature.\nEquipped creature gets +2/+2 and has deathtouch and lifelink.\nEquip—Sacrifice a creature.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  // Sanity: a kicker-cost card with a separate real mana-bearing activation
  // should still match (the kicker {2} gets skipped, but the {1}{G}: activation
  // is independently valid).
  it('matches kicker-keyword card with a separate mana-bearing activation', () => {
    const c = card({
      types: ['Creature'],
      typeLine: 'Creature',
      keywords: ['Kicker'],
      oracleText: 'Kicker {2}\n{1}{G}: This creature gets +1/+1 until end of turn.',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });

  // 2026-06-01 audit Group 8 — Suspicious Shambler: graveyard-cost-only
  // activation must not fire the battlefield-activated-ability tag.
  it('does not match a card whose only activation cost is "exile this card from your graveyard"', () => {
    const c = card({
      types: ['Creature'],
      typeLine: 'Creature — Zombie',
      oracleText: '{4}{B}{B}, Exile this card from your graveyard: Create two 2/2 black Zombie creature tokens. Activate only as a sorcery.',
    });
    expect(rule.matchCard!(c)).toBe(false);
  });

  // Companion regression — Tinybones-style: BOTH battlefield AND graveyard
  // activations. The pre-strip removes only the graveyard cost line.
  it('still matches when a card has both a graveyard activation AND a battlefield activation', () => {
    const c = card({
      types: ['Creature'],
      typeLine: 'Legendary Creature — Skeleton Rogue',
      oracleText: '{3}{B}, {T}: Each opponent discards a card. {2}{B}{B}, Exile this card from your graveyard: Create three 1/1 black Bat creature tokens with flying.',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
  });
});
