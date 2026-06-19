// pipeline/rules/effect.ramp_nonland.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.ramp_nonland';
import type { Card } from '../../shared/types';

function card(types: string[], oracleText: string, typeLine?: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: typeLine ?? types.join(' '),
    types, subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.ramp_nonland', () => {
  it.each([
    [['Creature'], '{t}: add {g}.'],
    [['Creature'], '{t}: add one mana of any color.'],
    [['Artifact'], '{t}: add {c}.'],
    [['Enchantment'], 'at the beginning of your upkeep, add {g}{g}.'],
    [['Artifact', 'Creature'], '{t}: add {w} or {u}.'],
  ])('matches non-land cards that add mana: %j / %s', (types, oracle) => {
    // matchCard receives (card, normalizedText) — pass the same text as both for the test
    expect(rule.matchCard!(card(types, oracle), oracle)).toBeTruthy();
  });

  it.each([
    // Rampant Growth template
    [['Sorcery'], 'search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'],
    // Cultivate / Kodama's Reach / Shared Roots variants
    [['Sorcery'], 'search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.'],
    // Tapped-creature land-fetcher (Compass Gnome / Topiary Panther family)
    [['Creature'], 'when this creature enters, search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'],
    // Prepared back-face Rampant Growth on a creature (concatenated faces)
    [['Creature'], 'this creature enters prepared. (while it\'s prepared, you may cast a copy of its spell. doing so unprepares it.) / / search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.'],
    // Modal land-fetcher (Glimpse the Core mode 1)
    [['Sorcery'], 'choose one — / • search your library for a basic forest card, put that card onto the battlefield tapped, then shuffle. / • return target cave card from your graveyard to the battlefield tapped.'],
    // v0.14.1 — Plant Beans / Exploration shape. Put a land from hand into
    // play directly, no library tutor. Spelunking, Nicanzil, Current
    // Conductor's land-card-from-hand option.
    [['Enchantment'], 'when this enchantment enters, draw a card, then you may put a land card from your hand onto the battlefield.'],
    [['Creature'], 'whenever a creature you control explores a land card, you may put a land card from your hand onto the battlefield tapped.'],
    // v0.14.7 — Regression (Flourishing Bloom-Kin): typed-land search across
    // a sentence boundary. "Search ... for up to two Forest cards and reveal
    // them. Put one of them onto the battlefield tapped..." — same Cultivate
    // family, just split into two sentences and using "Forest" instead of
    // "basic land".
    [['Creature'], 'when this creature is turned face up, search your library for up to two forest cards and reveal them. put one of them onto the battlefield tapped and the other into your hand, then shuffle.'],
    // Regression (Worldsoul's Rage): "put up to X land cards from your hand
    // and/or graveyard onto the battlefield tapped". Two broadenings on
    // pattern 4: (a) "up to N" / "up to X" quantifier in the determiner
    // slot, and (b) optional "and/or graveyard" source clause between "from
    // your hand" and "onto the battlefield".
    [['Sorcery'], '__self__ deals x damage to any target. put up to x land cards from your hand and/or graveyard onto the battlefield tapped.'],
    [['Sorcery'], 'put up to two land cards from your hand onto the battlefield tapped.'],
    [['Sorcery'], 'put up to three land cards from your graveyard onto the battlefield tapped.'],
    [['Sorcery'], 'put up to five land cards from your hand or graveyard onto the battlefield tapped.'],
    // Clifftop Lookout — reveal-until-land then put into play. Functionally
    // identical to Cultivate (non-land card surfaces a land into play) but
    // without the "search your library" anchor.
    [['Creature'], 'when this creature enters, reveal cards from the top of your library until you reveal a land card. put that card onto the battlefield tapped and the rest on the bottom of your library in a random order.'],
    // Variant: "until you reveal a basic land card" (more restrictive printing).
    [['Sorcery'], 'reveal cards from the top of your library until you reveal a basic land card. put it onto the battlefield tapped.'],
    // v0.30 — Group 22 — Skyserpent Seeker: reveal-until-N-lands. Same
    // ramp-from-deck axis as the singular "a land card" variant; the count
    // slot just needs to accept N>1.
    [['Creature'], 'flying, deathtouch exhaust — {4}: reveal cards from the top of your library until you reveal two land cards. put those land cards onto the battlefield tapped and the rest on the bottom of your library in a random order. put a +1/+1 counter on this creature.'],
    [['Sorcery'], 'reveal cards from the top of your library until you reveal three land cards. put them onto the battlefield tapped.'],
    // v0.45.0 — Zimone's Experiment: reveal-top-N, put all land cards revealed
    // this way onto the battlefield tapped. Library-reveal ramp.
    [['Sorcery'], 'reveal the top three cards of your library. put all land cards revealed this way onto the battlefield tapped.'],
  ])('matches non-land cards that tutor a basic land into play: %j', (types, oracle) => {
    expect(rule.matchCard!(card(types, oracle), oracle)).toBeTruthy();
  });

  it.each([
    [['Land'], '{t}: add {g}.'],
    [['Land'], '{t}: add one mana of any color.'],
    [['Basic', 'Land'], '{t}: add {w}.'],
  ])('does not match lands even if they add mana: %j', (types) => {
    expect(rule.matchCard!(card(types, '{t}: add {g}.'), '{t}: add {g}.')).toBe(false);
  });

  it.each([
    [['Creature'], '{t}: target creature gets +1/+1 until end of turn.'],
    [['Creature'], 'this creature deals 2 damage to any target.'],
    [['Sorcery'], 'draw three cards.'],
    [['Creature'], 'spend this mana only to cast spells with mana value 5 or greater.'], // restriction clause without "add"
    // Non-basic tutor — does NOT put a land into play, just searches/hand
    [['Sorcery'], 'search your library for a land card, reveal it, put it into your hand, then shuffle.'],
    // Search-for-basic but to hand (not into play) — closer to card selection than ramp
    [['Sorcery'], 'search your library for a basic land card, reveal it, put it into your hand, then shuffle.'],
    // Lands themselves searching for basics (e.g. Evolving Wilds) must not become ramp
    [['Land'], '{t}, sacrifice this land: search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'],
  ])('does not match non-mana effects: %j / %s', (types, oracle) => {
    expect(rule.matchCard!(card(types, oracle), oracle)).toBe(false);
  });

  // Regression (Aclazotz, Deepest Betrayal // Temple of the Dead): the
  // front face is a Creature but the back face is a Land. The "{T}: Add {B}"
  // mana ability lives on the Land face. card.types only reflects the front
  // face ("Creature"), so the types-only Land guard misses it. Cheapest fix:
  // also skip when typeLine contains "Land" (any face).
  it('does not match multi-face cards where any face is a Land (mana ability on land face)', () => {
    const oracle =
      'flying, lifelink whenever __self__ attacks, each opponent discards a card. ' +
      'when __self__ dies, return it to the battlefield tapped and transformed. ' +
      '{t}: add {b}. {2}{b}, {t}: transform this land.';
    const c = card(['Creature'], oracle, 'Legendary Creature — Bat God // Land');
    expect(rule.matchCard!(c, oracle)).toBe(false);
  });
});
