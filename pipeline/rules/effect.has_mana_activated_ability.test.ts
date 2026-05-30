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
  // Same positives as effect.has_activated_ability for the symbol/prose paths —
  // a "mana activated ability" is one whose cost can actually be reduced by
  // Training Grounds / Heartstone / Agatha. Symbol-bearing costs always
  // include mana; prose costs (sacrifice/discard/pay-life/tap-creatures) are
  // also reducible only when they have a mana component, but we include them
  // here to mirror the broad rule for now — the false-positive we're solving
  // is specifically Crew, not prose costs. Refine later if needed.
  it.each([
    ['{T}: Add {G}.'],
    ['{2}{G}: Add {G}{G}.'],
    ['{X}, {T}: __SELF__ deals X damage to any target.'],
    ['{1}, {T}, Sacrifice this creature: Search your library for an Equipment card.'],
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

  // A Vehicle that ALSO has a symbol/prose activation (e.g. Cultivator's
  // Caravan-shaped "{T}: Add one mana of any color") should still match —
  // the symbol-cost activation is mana-reducible. Crew alone is not the
  // disqualifier; the test is whether ANY mana-bearing activation exists.
  it('matches a Vehicle with Crew AND a symbol-cost activation', () => {
    const c = card({
      types: ['Artifact'],
      typeLine: 'Artifact — Vehicle',
      keywords: ['Crew'],
      oracleText: '{T}: Add one mana of any color.\nCrew 3',
    });
    expect(rule.matchCard!(c)).toBeTruthy();
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
});
