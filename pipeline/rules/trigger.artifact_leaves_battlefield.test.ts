import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.artifact_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.artifact_leaves_battlefield', () => {
  it.each([
    ['whenever an artifact leaves the battlefield'],
    ['whenever another artifact you control leaves the battlefield'],
    ['when an equipped artifact leaves the battlefield'],
    // v0.14.21 — artifact-subtype subjects (Clue, Treasure, Food, Equipment,
    // Vehicle are all always-artifact subtypes). Teysa, Opulent Oligarch:
    // "whenever a clue you control is put into a graveyard"; Ygra, Eater of
    // All: "whenever a food is put into a graveyard from the battlefield".
    ['whenever a clue you control is put into a graveyard from the battlefield'],
    ['whenever a food is put into a graveyard from the battlefield'],
    ['whenever a treasure you control leaves the battlefield'],
    ['whenever an equipment you control leaves the battlefield'],
    ['whenever a vehicle you control leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression (Vengeful Tracker): active-voice "X sacrifices an artifact"
  // is semantically an artifact-LtB event (the artifact moves from
  // battlefield to graveyard) but the LTB_VERB anchor only matched the
  // passive "leaves the battlefield" / "is put into a graveyard from the
  // battlefield" frames. The punisher axis ("Whenever an opponent sacrifices
  // a/an artifact/Clue/Treasure/...") needs to pair with effect.sacrifice_*
  // producers via this trigger axis.
  it.each([
    ['whenever an opponent sacrifices an artifact, this creature deals 2 damage to them'],
    ['whenever a player sacrifices an artifact'],
    ['whenever an opponent sacrifices a treasure'],
    ['whenever each opponent sacrifices an artifact'],
    ['whenever any opponent sacrifices a clue'],
  ])('text-matches active-voice sacrifice frame: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Negative: "you sacrifice" is the controller's own sacrifice — handled
  // by trigger.permanent_sacrificed (aristocrats axis), not the LtB punisher
  // axis. Keeping these out prevents the two trigger axes from collapsing.
  it.each([
    ['whenever you sacrifice an artifact'],
    ['whenever you sacrifice a treasure'],
  ])('text does not match controller-self sacrifice (aristocrats axis): %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact card', () => {
    const card = makeCard({ types: ['Artifact'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-artifact card does NOT match', () => {
    const card = makeCard({ types: ['Enchantment'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact-creature DOES match (multi-type)', () => {
    const card = makeCard({ types: ['Artifact', 'Creature'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  // v0.14.17 — Regression (Krovod Haunch). Two combined fixes verified by this
  // test: (a) types check is case-insensitive against the real artifact data
  // (which stores capitalized `['Artifact']`), and (b) self subject uses the
  // subtype noun "this Equipment" rather than "__self__", paired with the
  // "is put into a graveyard from the battlefield" RAW phrasing.
  it('matchCard: SELF graveyard wording on "this Equipment" DOES match (Krovod Haunch shape)', () => {
    const card = makeCard({ types: ['Artifact'], subtypes: ['Food', 'Equipment'] });
    const normalizedText = 'when this equipment is put into a graveyard from the battlefield, you may pay {1}{w}';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  // Carrot Cake — "when you sacrifice it" is a self-LtB event in active voice.
  // The active-voice "you sacrifice it/this/__self__" frame must scope via
  // matchCard to artifact-typed cards so it doesn't leak onto creatures (where
  // the trigger.permanent_sacrificed aristocrats axis is the correct home).
  it('matchCard: "when you sacrifice it" on an artifact DOES match (Carrot Cake shape)', () => {
    const card = makeCard({ types: ['Artifact'], subtypes: ['Food'] });
    const normalizedText = 'when this artifact enters and when you sacrifice it, create a 1/1 white rabbit creature token and scry 1';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: "when you sacrifice it" on a non-artifact does NOT match', () => {
    const card = makeCard({ types: ['Creature'] });
    const normalizedText = 'when you sacrifice it, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBe(false);
  });
});
