import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.creature_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.creature_leaves_battlefield', () => {
  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever another creature you control leaves the battlefield'],
    ['when an enchanted creature leaves the battlefield'],
    // v0.14.1 — Craft exile-from-battlefield trigger. Market Gnome: "when this
    // creature is exiled from the battlefield while you're activating a craft
    // ability". Exile is a valid LTB route.
    ['when a creature is exiled from the battlefield, draw a card'],
    // v0.14.9 — Regression (Kaya, Spirits' Justice): "are put into exile" verb
    // route. Kaya's compound trigger fires when creatures-you-control AND/OR
    // graveyard-cards are put into exile — the battlefield-side branch.
    ['whenever one or more creatures you control are put into exile, draw a card'],
    ['whenever a creature you control is put into exile'],
    // Dour Port-Mage — plural subject takes plural verb "leave the battlefield"
    // (without the singular -s). The flicker-payoff LtB axis must admit both
    // singular and plural verb forms so cards like "whenever one or more other
    // creatures you control leave the battlefield without dying" register.
    ['whenever one or more other creatures you control leave the battlefield without dying, draw a card'],
    ['whenever two or more creatures leave the battlefield this turn'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever an artifact leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['when a creature you control dies'],     // dies is a separate trigger
    ['whenever a permanent leaves the battlefield'], // broad parent's job
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on a creature card', () => {
    const card = makeCard({ types: ['Creature'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-creature card does NOT match', () => {
    const card = makeCard({ types: ['Enchantment'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBe(false);
  });

  it('matchCard: SELF trigger on an artifact-creature DOES match (multi-type)', () => {
    const card = makeCard({ types: ['Artifact', 'Creature'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  // v0.14.1 — Market Gnome: SELF "is exiled from the battlefield" trigger.
  it('matchCard: SELF "is exiled from the battlefield" on a creature card', () => {
    const card = makeCard({ types: ['Creature'] });
    const normalizedText =
      "when this creature is exiled from the battlefield while you're activating a craft ability, you gain 1 life and draw a card";
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });
});
